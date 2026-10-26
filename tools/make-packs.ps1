# Собирает ВСЕ дополнения (аниме-арты и видео-обои) в dist\packs\*.exe. Видео делятся на части до ~400 МБ (лимит файла на GitHub — 2 ГБ).
# Запуск: powershell -ExecutionPolicy Bypass -File tools\make-packs.ps1 [-PartMB 400]
param([int]$PartMB = 400)
$ErrorActionPreference = 'Stop'
$src = Split-Path $PSScriptRoot -Parent
$lib = Join-Path $env:LOCALAPPDATA 'LiveWall\Library'
$dist = Join-Path $src 'dist\packs'
$stage = Join-Path $env:TEMP 'lumora-packs'
Remove-Item $dist, $stage -Recurse -Force -ErrorAction SilentlyContinue
New-Item -ItemType Directory -Force $dist, $stage | Out-Null
Add-Type -AssemblyName System.IO.Compression, System.IO.Compression.FileSystem
$fw = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319'
$ico = Join-Path $src 'LiveWall.ico'
Push-Location $src; node tools\gen.js | Out-Null; Pop-Location

function New-Pack($id, $zipEntries, $title, $sub, $text) {
    $zipPath = Join-Path $stage "$id.zip"
    $fs = [IO.File]::Create($zipPath); $zip = New-Object IO.Compression.ZipArchive($fs, [IO.Compression.ZipArchiveMode]::Create)
    foreach ($e in $zipEntries) { [void][IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $e.Path, $e.Name, [IO.Compression.CompressionLevel]::NoCompression) }
    $zip.Dispose(); $fs.Dispose()
    $txt = Join-Path $stage "$id.txt"
    [IO.File]::WriteAllText($txt, ($title + "`n" + $sub + "`n" + $text), (New-Object Text.UTF8Encoding $false))
    $out = Join-Path $dist "$id.exe"
    & "$fw\csc.exe" /nologo /target:winexe /platform:x64 /optimize+ /codepage:65001 "/win32icon:$ico" "/out:$out" `
        /r:System.dll /r:System.Core.dll /r:System.Drawing.dll /r:System.Windows.Forms.dll /r:System.IO.Compression.dll /r:System.IO.Compression.FileSystem.dll `
        "/resource:$zipPath,pack.zip" "/resource:$txt,pack.txt" (Join-Path $src 'installer\Setup.cs') | Out-Null
    if ($LASTEXITCODE -ne 0) { throw "Ошибка сборки $id" }
    Remove-Item $zipPath, $txt -Force
    Write-Host ("{0}: {1} МБ" -f $id, [math]::Round((Get-Item $out).Length / 1MB, 1))
}

# ---------- 1. Аниме-арты ----------
$cat = Get-Content (Join-Path $src 'builtin\catalog.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$arts = @($cat | Where-Object { $_.name -like 'Живой арт*' })
$entries = @()
foreach ($f in Get-ChildItem (Join-Path $src 'builtin\art') -File) { $entries += [pscustomobject]@{ Path = $f.FullName; Name = 'art/' + $f.Name } }
foreach ($a in $arts) {
    $entries += [pscustomobject]@{ Path = (Join-Path $src ('builtin\' + $a.file)); Name = $a.file }
    $th = Join-Path $src ('builtin\thumbs\' + $a.name + '.jpg')
    if (Test-Path $th) { $entries += [pscustomobject]@{ Path = $th; Name = '_packs/thumbs/' + $a.name + '.jpg' } }
}
$cj = Join-Path $stage 'anime-arts.json'
[IO.File]::WriteAllText($cj, (ConvertTo-Json -InputObject $arts -Depth 6), (New-Object Text.UTF8Encoding $false))
$entries += [pscustomobject]@{ Path = $cj; Name = '_packs/anime-arts.json' }
New-Pack 'Lumora-AnimeArts' $entries 'Lumora — аниме-арты' ('Живые аниме-арты · ' + $arts.Count + ' шт.') ('Картинки оживают: движутся за курсором, поверх частицы и блики. ' + $arts.Count + ' артов.')

# ---------- 2. Видео-обои, по группам и частям ----------
$idx = Get-Content (Join-Path $lib '_video\index.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$slug = @{ 'Аниме' = 'Anime'; 'Игры' = 'Games'; 'Кино и мемы' = 'Movies-Memes'; 'Авто' = 'Cars'; 'Природа и космос' = 'Nature-Space' }
$limit = $PartMB * 1MB
foreach ($grp in ($idx.PSObject.Properties | Group-Object { $_.Value.group } | Sort-Object Name)) {
    $files = $grp.Group | Where-Object { Test-Path (Join-Path $lib $_.Name) } | Sort-Object Name
    $parts = @(); $cur = @(); $size = 0
    foreach ($p in $files) {
        $len = (Get-Item (Join-Path $lib $p.Name)).Length
        if ($cur.Count -gt 0 -and $size + $len -gt $limit) { $parts += , $cur; $cur = @(); $size = 0 }
        $cur += $p; $size += $len
    }
    if ($cur.Count) { $parts += , $cur }
    $s = $slug[$grp.Name]; if (-not $s) { $s = 'Other' }
    $n = 0
    foreach ($part in $parts) {
        $n++
        $id = if ($parts.Count -gt 1) { "Lumora-Videos-$s-$n" } else { "Lumora-Videos-$s" }
        $entries = @(); $sub = [ordered]@{}
        foreach ($p in $part) {
            $entries += [pscustomobject]@{ Path = (Join-Path $lib $p.Name); Name = $p.Name }
            $th = Join-Path $lib ('_video\thumbs\' + [IO.Path]::GetFileNameWithoutExtension($p.Name) + '.jpg')
            if (Test-Path $th) { $entries += [pscustomobject]@{ Path = $th; Name = '_video/thumbs/' + [IO.Path]::GetFileNameWithoutExtension($p.Name) + '.jpg' } }
            $sub[$p.Name] = $p.Value
        }
        $ij = Join-Path $stage "index.$id.json"
        [IO.File]::WriteAllText($ij, ($sub | ConvertTo-Json -Depth 4), (New-Object Text.UTF8Encoding $false))
        $entries += [pscustomobject]@{ Path = $ij; Name = "_video/index.$id.json" }
        $title = "Lumora — видео: " + $grp.Name + $(if ($parts.Count -gt 1) { " ($n из $($parts.Count))" } else { '' })
        New-Pack $id $entries $title ('Видео-обои 1080p · ' + $part.Count + ' шт.') ('Коллекция «' + $grp.Name + '»: ' + $part.Count + ' видео-обоев.')
        Remove-Item $ij -Force
    }
}
Remove-Item $stage -Recurse -Force -ErrorAction SilentlyContinue
$all = Get-ChildItem $dist -Filter *.exe
Write-Host ("Готово: {0} установщиков, {1} МБ" -f $all.Count, [math]::Round(($all | Measure-Object Length -Sum).Sum / 1MB))
