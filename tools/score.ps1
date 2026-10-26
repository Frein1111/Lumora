# Оценка «красоты» превью: яркость, насыщенность, контраст, доля тёмных пикселей -> ui/scores.js (id -> 0..100)
Add-Type -AssemblyName System.Drawing
$root = Split-Path $PSScriptRoot -Parent
$lib = Join-Path $env:LOCALAPPDATA 'LiveWall\Library'
$cat = Get-Content (Join-Path $root 'builtin\catalog.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$items = @()
foreach ($c in $cat) { $items += [pscustomobject]@{ id = $c.file; thumb = Join-Path $root ('builtin\thumbs\' + [IO.Path]::GetFileNameWithoutExtension($c.file) + '.jpg') } }
foreach ($f in Get-ChildItem (Join-Path $lib '_video\thumbs\*.jpg')) { $items += [pscustomobject]@{ id = ($f.BaseName + '.mp4'); thumb = $f.FullName } }
$out = [ordered]@{}
foreach ($it in $items) {
  try {
    $src = [System.Drawing.Image]::FromFile($it.thumb)
    $bmp = New-Object System.Drawing.Bitmap 32, 18
    $g = [System.Drawing.Graphics]::FromImage($bmp); $g.DrawImage($src, 0, 0, 32, 18); $g.Dispose(); $src.Dispose()
    $n = 0; $sumL = 0.0; $sumS = 0.0; $sumL2 = 0.0; $dark = 0; $bright = 0
    for ($y = 0; $y -lt 18; $y++) { for ($x = 0; $x -lt 32; $x++) {
      $p = $bmp.GetPixel($x, $y); $r = $p.R / 255.0; $gg = $p.G / 255.0; $b = $p.B / 255.0
      $mx = [Math]::Max($r, [Math]::Max($gg, $b)); $mn = [Math]::Min($r, [Math]::Min($gg, $b))
      $l = 0.299 * $r + 0.587 * $gg + 0.114 * $b
      $s = if ($mx -gt 0) { ($mx - $mn) / $mx } else { 0 }
      $sumL += $l; $sumL2 += $l * $l; $sumS += $s * [Math]::Min(1, $mx * 2); $n++
      if ($l -lt 0.10) { $dark++ }; if ($l -gt 0.92) { $bright++ }
    } }
    $bmp.Dispose()
    $meanL = $sumL / $n; $sd = [Math]::Sqrt([Math]::Max(0, $sumL2 / $n - $meanL * $meanL)); $sat = $sumS / $n
    $darkF = $dark / $n; $brightF = $bright / $n
    $score = 60 * [Math]::Min(1.3, $sat / 0.62) + 28 * [Math]::Min(1.3, $sd / 0.36) + 12 * (1 - [Math]::Min(1, [Math]::Abs($meanL - 0.45) / 0.45))
    if ($darkF -gt 0.45) { $score -= 40 * ($darkF - 0.45) / 0.55 * 2 }
    if ($brightF -gt 0.5) { $score -= 25 * ($brightF - 0.5) * 2 }
    $out[$it.id] = [Math]::Round([Math]::Max(0, [Math]::Min(100, $score)), 1)
  } catch { $out[$it.id] = 30 }
}
$json = ($out.GetEnumerator() | ForEach-Object { '"' + ($_.Key -replace '\\', '\\' -replace '"', '\"') + '":' + ([string]$_.Value).Replace(',', '.') }) -join ','
[IO.File]::WriteAllText((Join-Path $root 'tools\scores.json'), '{' + $json + '}', (New-Object Text.UTF8Encoding $false))
Write-Host ('оценено: ' + $out.Count)
