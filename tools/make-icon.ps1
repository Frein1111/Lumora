# Рисует значок приложения и сохраняет его как LiveWall.ico (PNG-кадры 16..256).
param([string]$Out)
Add-Type -AssemblyName System.Drawing

function New-Frame([int]$size) {
    $bmp = New-Object System.Drawing.Bitmap $size, $size, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = 'AntiAlias'; $g.InterpolationMode = 'HighQualityBicubic'; $g.PixelOffsetMode = 'HighQuality'
    $g.Clear([System.Drawing.Color]::Transparent)
    $pad = [single]($size * 0.04); $w = [single]($size - 2 * $pad); $r = [single]($size * 0.23)

    # скруглённый квадрат с градиентом
    $path = New-Object System.Drawing.Drawing2D.GraphicsPath
    $d = $r * 2
    $path.AddArc($pad, $pad, $d, $d, 180, 90); $path.AddArc($pad + $w - $d, $pad, $d, $d, 270, 90)
    $path.AddArc($pad + $w - $d, $pad + $w - $d, $d, $d, 0, 90); $path.AddArc($pad, $pad + $w - $d, $d, $d, 90, 90); $path.CloseFigure()
    $rect = New-Object System.Drawing.RectangleF $pad, $pad, $w, $w
    # фон: фиолетово-розовый градиент
    $grad = New-Object System.Drawing.Drawing2D.LinearGradientBrush $rect, ([System.Drawing.Color]::FromArgb(255, 30, 18, 84)), ([System.Drawing.Color]::FromArgb(255, 214, 54, 160)), 60
    $blend = New-Object System.Drawing.Drawing2D.ColorBlend 3
    $blend.Colors = @([System.Drawing.Color]::FromArgb(255, 26, 16, 78), [System.Drawing.Color]::FromArgb(255, 122, 52, 232), [System.Drawing.Color]::FromArgb(255, 255, 96, 170))
    $blend.Positions = @(0.0, 0.55, 1.0)
    $grad.InterpolationColors = $blend
    $g.FillPath($grad, $path)
    $g.SetClip($path)

    # мягкое свечение за звездой
    $cx = $size * 0.5; $cy = $size * 0.5
    $gp = New-Object System.Drawing.Drawing2D.GraphicsPath
    $gp.AddEllipse([single]($cx - $size * 0.46), [single]($cy - $size * 0.46), [single]($size * 0.92), [single]($size * 0.92))
    $pg = New-Object System.Drawing.Drawing2D.PathGradientBrush $gp
    $pg.CenterColor = [System.Drawing.Color]::FromArgb(150, 255, 190, 240)
    $pg.SurroundColors = @([System.Drawing.Color]::FromArgb(0, 255, 120, 220))
    $g.FillPath($pg, $gp)

    # звезда-искра: большая и маленькая
    function Star([double]$x, [double]$y, [double]$R, [int]$alpha) {
        $inner = $R * 0.2
        $pts = New-Object 'System.Collections.Generic.List[System.Drawing.PointF]'
        for ($i = 0; $i -lt 8; $i++) {
            $ang = [Math]::PI / 2 * ($i / 2.0) - [Math]::PI / 2
            $rr = if ($i % 2 -eq 0) { $R } else { $inner }
            $pts.Add((New-Object System.Drawing.PointF ([single]($x + [Math]::Cos($ang) * $rr)), ([single]($y + [Math]::Sin($ang) * $rr))))
        }
        $br = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::FromArgb($alpha, 255, 255, 255))
        $g.FillPolygon($br, $pts.ToArray()); $br.Dispose()
    }
    Star $cx ($cy + $size * 0.02) ($size * 0.34) 255
    if ($size -ge 32) { Star ($size * 0.76) ($size * 0.26) ($size * 0.11) 235; Star ($size * 0.25) ($size * 0.74) ($size * 0.07) 200 }
    $g.Dispose()
    $ms = New-Object System.IO.MemoryStream
    $bmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $bmp.Dispose()
    return , $ms.ToArray()
}

$sizes = 16, 24, 32, 48, 64, 128, 256
$frames = @(); foreach ($s in $sizes) { $frames += , (New-Frame $s) }
$fs = [System.IO.File]::Create($Out)
$bw = New-Object System.IO.BinaryWriter $fs
$bw.Write([uint16]0); $bw.Write([uint16]1); $bw.Write([uint16]$sizes.Count)
$offset = 6 + 16 * $sizes.Count
for ($i = 0; $i -lt $sizes.Count; $i++) {
    $s = $sizes[$i]; $b = if ($s -ge 256) { 0 } else { $s }
    $bw.Write([byte]$b); $bw.Write([byte]$b); $bw.Write([byte]0); $bw.Write([byte]0)
    $bw.Write([uint16]1); $bw.Write([uint16]32); $bw.Write([uint32]$frames[$i].Length); $bw.Write([uint32]$offset)
    $offset += $frames[$i].Length
}
foreach ($f in $frames) { $bw.Write($f) }
$bw.Close(); $fs.Close()
Write-Host "Значок: $Out"
