$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$repository = Split-Path -Parent $PSScriptRoot
$source = Join-Path $repository "extension"
$sourcePrefix = $source.TrimEnd("\") + "\"
$destination = Join-Path $repository "dist\Lingora-Extension.zip"
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $destination) | Out-Null
if (Test-Path -LiteralPath $destination) { Remove-Item -LiteralPath $destination -Force }

$stream = [IO.File]::Open($destination, [IO.FileMode]::CreateNew)
$archive = [IO.Compression.ZipArchive]::new($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
    Get-ChildItem -LiteralPath $source -Recurse -File |
        Where-Object Name -NE "Lingora.ico" |
        Sort-Object FullName |
        ForEach-Object {
            $relative = $_.FullName.Substring($sourcePrefix.Length).Replace("\", "/")
            [IO.Compression.ZipFileExtensions]::CreateEntryFromFile(
                $archive,
                $_.FullName,
                $relative,
                [IO.Compression.CompressionLevel]::Optimal
            ) | Out-Null
        }
}
finally {
    $archive.Dispose()
    $stream.Dispose()
}

Write-Host "Created $destination"
