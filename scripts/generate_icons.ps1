param([string]$OutputDirectory = "$PSScriptRoot\..\extension\icons")

Add-Type -AssemblyName System.Drawing
$resolvedOutput = [IO.Path]::GetFullPath($OutputDirectory)
[IO.Directory]::CreateDirectory($resolvedOutput) | Out-Null

function New-RoundedRectangle([Drawing.RectangleF]$rectangle, [float]$radius) {
    $path = [Drawing.Drawing2D.GraphicsPath]::new()
    $diameter = $radius * 2
    $path.AddArc($rectangle.X, $rectangle.Y, $diameter, $diameter, 180, 90)
    $path.AddArc($rectangle.Right - $diameter, $rectangle.Y, $diameter, $diameter, 270, 90)
    $path.AddArc($rectangle.Right - $diameter, $rectangle.Bottom - $diameter, $diameter, $diameter, 0, 90)
    $path.AddArc($rectangle.X, $rectangle.Bottom - $diameter, $diameter, $diameter, 90, 90)
    $path.CloseFigure()
    return $path
}

$master = [Drawing.Bitmap]::new(256, 256)
$graphics = [Drawing.Graphics]::FromImage($master)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$background = New-RoundedRectangle ([Drawing.RectangleF]::new(8, 8, 240, 240)) 54
$gradient = [Drawing.Drawing2D.LinearGradientBrush]::new(
    [Drawing.PointF]::new(20, 20), [Drawing.PointF]::new(236, 236),
    [Drawing.Color]::FromArgb(139, 92, 246), [Drawing.Color]::FromArgb(67, 97, 238)
)
$graphics.FillPath($gradient, $background)
$speaker = [Drawing.PointF[]]@(
    [Drawing.PointF]::new(57, 96), [Drawing.PointF]::new(93, 96),
    [Drawing.PointF]::new(139, 62), [Drawing.PointF]::new(139, 194),
    [Drawing.PointF]::new(93, 160), [Drawing.PointF]::new(57, 160)
)
$graphics.FillPolygon([Drawing.Brushes]::White, $speaker)
$pen = [Drawing.Pen]::new([Drawing.Color]::White, 14)
$pen.StartCap = $pen.EndCap = [Drawing.Drawing2D.LineCap]::Round
$graphics.DrawArc($pen, 131, 92, 64, 72, -55, 110)
$graphics.DrawArc($pen, 137, 66, 102, 124, -55, 110)
$pen.Dispose(); $gradient.Dispose(); $background.Dispose(); $graphics.Dispose()

foreach ($size in 16, 32, 48, 128) {
    $icon = [Drawing.Bitmap]::new($size, $size)
    $canvas = [Drawing.Graphics]::FromImage($icon)
    $canvas.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $canvas.DrawImage($master, 0, 0, $size, $size)
    $canvas.Dispose()
    $icon.Save((Join-Path $resolvedOutput "icon$size.png"), [Drawing.Imaging.ImageFormat]::Png)
    $icon.Dispose()
}
$handle = $master.GetHicon()
$windowsIcon = [Drawing.Icon]::FromHandle($handle)
$iconStream = [IO.File]::Create((Join-Path $resolvedOutput "LingoDub.ico"))
$windowsIcon.Save($iconStream)
$iconStream.Dispose()
$windowsIcon.Dispose()
$master.Dispose()
