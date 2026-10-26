# Собирает установщик Lumora-Setup.exe (папка dist). Запуск: powershell -ExecutionPolicy Bypass -File tools\make-installer.ps1 [-WithArt]
# По умолчанию в установщик НЕ кладутся скачанные аниме-арты (builtin\art): они принадлежат своим авторам, публиковать их нельзя.
param([switch]$WithArt)
$ErrorActionPreference = 'Stop'
$src = Split-Path $PSScriptRoot -Parent
$stage = Join-Path $env:TEMP 'lumora-stage'
$app = Join-Path $stage 'app'
$dist = Join-Path $src 'dist'
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $app, $dist | Out-Null

# 1. Чистая копия проекта и пересборка обоев (без артов, если не просили)
$work = Join-Path $stage 'proj'
robocopy $src $work /E /XD dist .git node_modules shots uishots /XF *.bak /NFL /NDL /NJH /NJS /NP | Out-Null
if (-not $WithArt) {
    Remove-Item (Join-Path $work 'builtin\art') -Recurse -Force -ErrorAction SilentlyContinue
    Remove-Item (Join-Path $work 'src\scenes\07_anime_art.js') -Force -ErrorAction SilentlyContinue
}
Push-Location $work
node tools\gen.js
Pop-Location
# превью без обоев — лишние убираем
$names = (Get-Content (Join-Path $work 'builtin\catalog.json') -Raw -Encoding UTF8 | ConvertFrom-Json) | ForEach-Object { $_.name }
Get-ChildItem (Join-Path $work 'builtin\thumbs\*.jpg') | Where-Object { $names -notcontains $_.BaseName } | Remove-Item -Force

# 2. Компиляция программы
$webv = '1.0.2903.40'; $pkg = Join-Path $src "packages\webview2-$webv"
if (-not (Test-Path "$pkg\lib")) { throw 'Нет пакета WebView2: сначала запустите build.ps1' }
Copy-Item "$pkg\lib\net462\Microsoft.Web.WebView2.Core.dll", "$pkg\lib\net462\Microsoft.Web.WebView2.WinForms.dll", "$pkg\runtimes\win-x64\native\WebView2Loader.dll" $app -Force
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $src 'tools\make-icon.ps1') -Out (Join-Path $work 'LiveWall.ico') | Out-Null
Copy-Item (Join-Path $work 'LiveWall.ico') (Join-Path $app 'Lumora.ico') -Force
Copy-Item (Join-Path $work 'player.html') $app -Force
Copy-Item (Join-Path $work 'ui') (Join-Path $app 'ui') -Recurse -Force
Copy-Item (Join-Path $work 'builtin') (Join-Path $app 'builtin') -Recurse -Force
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'; $winmd = Join-Path $env:WINDIR 'System32\WinMetadata'
$files = 'Core','Wallpaper','Gallery','SettingsForm','Studio','App','Music','Widget','Discord','ClockWidget' | ForEach-Object { Join-Path $work "$_.cs" }
& "$fw\csc.exe" /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 "/win32icon:$(Join-Path $work 'LiveWall.ico')" "/out:$app\LiveWall.exe" `
    /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll `
    "/r:$fw\System.Runtime.dll" "/r:$fw\System.Runtime.WindowsRuntime.dll" "/r:$fw\System.Runtime.InteropServices.WindowsRuntime.dll" `
    "/r:$winmd\Windows.Foundation.winmd" "/r:$winmd\Windows.Media.winmd" "/r:$winmd\Windows.Storage.winmd" `
    "/r:$app\Microsoft.Web.WebView2.Core.dll" "/r:$app\Microsoft.Web.WebView2.WinForms.dll" $files
if ($LASTEXITCODE -ne 0) { throw 'Ошибка компиляции программы' }

# 3. Архив с программой (имена в UTF-8, слэши прямые)
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$zipPath = Join-Path $stage 'payload.zip'
$fs = [IO.File]::Create($zipPath); $zip = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
$base = (Resolve-Path $app).Path.TrimEnd('\') + '\'
foreach ($f in Get-ChildItem $app -Recurse -File) {
    $rel = $f.FullName.Substring($base.Length).Replace('\', '/')
    [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $f.FullName, $rel, [IO.Compression.CompressionLevel]::Optimal)
}
$zip.Dispose(); $fs.Dispose()

# 4. Установщик с архивом внутри
$out = Join-Path $dist 'Lumora-Setup.exe'
& "$fw\csc.exe" /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 "/win32icon:$(Join-Path $work 'LiveWall.ico')" "/out:$out" `
    /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll `
    "/resource:$zipPath,payload.zip" (Join-Path $src 'installer\Setup.cs')
if ($LASTEXITCODE -ne 0) { throw 'Ошибка сборки установщика' }
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
$mb = [math]::Round((Get-Item $out).Length / 1MB, 1)
Write-Host "Готово: $out ($mb МБ)"
