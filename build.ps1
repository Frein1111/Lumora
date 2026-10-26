# Сборка и установка LiveWall.
# Запуск: powershell -ExecutionPolicy Bypass -File build.ps1 [-NoLaunch]

param([switch]$NoLaunch)
$ErrorActionPreference = 'Stop'
$src = $PSScriptRoot
$out = Join-Path $env:LOCALAPPDATA 'LiveWall\app'
$webViewVersion = '1.0.2903.40'
$pkgDir = Join-Path $src "packages\webview2-$webViewVersion"

# 1. Пакет WebView2 (официальный, от Microsoft) — скачиваем один раз
if (-not (Test-Path "$pkgDir\lib")) {
    Write-Host "Скачиваю WebView2 SDK $webViewVersion..."
    New-Item -ItemType Directory -Force $pkgDir | Out-Null
    $zip = Join-Path $pkgDir 'webview2.zip'
    Invoke-WebRequest "https://www.nuget.org/api/v2/package/Microsoft.Web.WebView2/$webViewVersion" -OutFile $zip -UseBasicParsing
    Expand-Archive $zip -DestinationPath $pkgDir -Force
    Remove-Item $zip
}

# 2. Значок приложения
$ico = Join-Path $src 'LiveWall.ico'
& powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $src 'tools\make-icon.ps1') -Out $ico
if (-not (Test-Path $ico)) { throw 'Не удалось создать значок' }

# 3. Останавливаем запущенную версию
Get-Process LiveWall -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Milliseconds 600

# 4. Копируем библиотеки и обои
New-Item -ItemType Directory -Force $out | Out-Null
if (Test-Path "$out\builtin") { Remove-Item "$out\builtin" -Recurse -Force }
New-Item -ItemType Directory -Force "$out\builtin" | Out-Null
Copy-Item "$pkgDir\lib\net462\Microsoft.Web.WebView2.Core.dll", "$pkgDir\lib\net462\Microsoft.Web.WebView2.WinForms.dll" $out -Force
Copy-Item "$pkgDir\runtimes\win-x64\native\WebView2Loader.dll" $out -Force
Copy-Item "$src\player.html" $out -Force
if (Test-Path "$out\ui") { Remove-Item "$out\ui" -Recurse -Force }
Copy-Item "$src\ui" "$out\ui" -Recurse -Force
Copy-Item "$src\builtin\*" "$out\builtin" -Recurse -Force
Copy-Item $ico (Join-Path $out "Lumora.ico") -Force

# 5. Компилируем встроенным в Windows компилятором C#
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$winmd = Join-Path $env:WINDIR 'System32\WinMetadata'
& "$fw\csc.exe" /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 "/win32icon:$ico" `
    "/out:$out\LiveWall.exe" `
    /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.Web.Extensions.dll `
    "/r:$fw\System.Runtime.dll" "/r:$fw\System.Runtime.WindowsRuntime.dll" "/r:$fw\System.Runtime.InteropServices.WindowsRuntime.dll" `
    "/r:$winmd\Windows.Foundation.winmd" "/r:$winmd\Windows.Media.winmd" "/r:$winmd\Windows.Storage.winmd" `
    "/r:$out\Microsoft.Web.WebView2.Core.dll" "/r:$out\Microsoft.Web.WebView2.WinForms.dll" `
    "$src\Core.cs" "$src\Wallpaper.cs" "$src\Gallery.cs" "$src\SettingsForm.cs" "$src\Studio.cs" "$src\App.cs" "$src\Music.cs" "$src\Widget.cs" "$src\Discord.cs" "$src\ClockWidget.cs"
if ($LASTEXITCODE -ne 0) { throw "Ошибка компиляции" }

# 6. Автозагрузка
Set-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Run' -Name 'LiveWall' -Value "`"$out\LiveWall.exe`" --background"

# 7. Ярлыки: меню «Пуск» и рабочий стол
$shell = New-Object -ComObject WScript.Shell
foreach ($dir in @([Environment]::GetFolderPath('Programs'), [Environment]::GetFolderPath('Desktop'))) {
    Remove-Item (Join-Path $dir 'Живые обои.lnk') -ErrorAction SilentlyContinue
    $lnk = Join-Path $dir 'Lumora.lnk'
    $shortcut = $shell.CreateShortcut($lnk)
    $shortcut.TargetPath = "$out\LiveWall.exe"
    $shortcut.WorkingDirectory = $out
    $shortcut.IconLocation = "$out\Lumora.ico,0"
    $shortcut.Description = 'Lumora — живые обои рабочего стола'
    $shortcut.Save()
    Write-Host "Ярлык: $lnk"
}

Write-Host "Готово: $out\LiveWall.exe"
if (-not $NoLaunch) { Start-Process "$out\LiveWall.exe" }
