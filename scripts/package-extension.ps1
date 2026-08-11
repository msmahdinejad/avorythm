$ErrorActionPreference = "Stop"
$repository = Split-Path -Parent $PSScriptRoot
$destination = Join-Path $repository "dist\LingoDub-Extension.zip"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }
Compress-Archive -Path (Join-Path $repository "extension\*") -DestinationPath $destination -CompressionLevel Optimal
Write-Host "Created $destination"
