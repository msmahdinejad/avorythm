param(
    [string]$OutputDirectory = "$PSScriptRoot\..\extension\icons",
    [string]$SourceLogo = "$PSScriptRoot\..\assets\branding\avorythm-logo.png"
)

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

$resolvedLogo = [IO.Path]::GetFullPath($SourceLogo)
if (-not [IO.File]::Exists($resolvedLogo)) {
    throw "Logo not found: $resolvedLogo"
}

$source = [Drawing.Bitmap]::FromFile($resolvedLogo)
$master = [Drawing.Bitmap]::new(256, 256, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
$graphics = [Drawing.Graphics]::FromImage($master)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.Clear([Drawing.Color]::Transparent)
$background = New-RoundedRectangle ([Drawing.RectangleF]::new(8, 8, 240, 240)) 54
$gradient = [Drawing.Drawing2D.LinearGradientBrush]::new(
    [Drawing.PointF]::new(20, 20), [Drawing.PointF]::new(236, 236),
    [Drawing.Color]::FromArgb(17, 20, 33), [Drawing.Color]::FromArgb(9, 11, 19)
)
$graphics.FillPath($gradient, $background)
$sourceRectangle = [Drawing.Rectangle]::new(0, 0, $source.Width, $source.Height)
$destinationRectangle = [Drawing.Rectangle]::new(22, 22, 212, 212)
$graphics.DrawImage(
    $source,
    $destinationRectangle,
    $sourceRectangle,
    [Drawing.GraphicsUnit]::Pixel
)
$gradient.Dispose(); $background.Dispose(); $graphics.Dispose(); $source.Dispose()

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
$iconStream = [IO.File]::Create((Join-Path $resolvedOutput "Avorythm.ico"))
$windowsIcon.Save($iconStream)
$iconStream.Dispose()
$windowsIcon.Dispose()
$master.Dispose()
