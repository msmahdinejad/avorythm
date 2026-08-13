$ErrorActionPreference = "Stop"

$repositorySource = Join-Path (Split-Path -Parent $PSScriptRoot) "extension"
$installedSource = Join-Path $PSScriptRoot "extension"
$source = if (Test-Path -LiteralPath (Join-Path $installedSource "manifest.json")) {
    $installedSource
} else {
    $repositorySource
}
if (-not (Test-Path -LiteralPath (Join-Path $source "manifest.json"))) {
    throw "Dubira extension files were not found."
}

$destination = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA "Dubira\Extension"))
$expectedRoot = [IO.Path]::GetFullPath((Join-Path $env:LOCALAPPDATA "Dubira"))
if (-not $destination.StartsWith($expectedRoot, [StringComparison]::OrdinalIgnoreCase)) {
    throw "Unsafe extension destination."
}
if (Test-Path -LiteralPath $destination) {
    Remove-Item -LiteralPath $destination -Recurse -Force
}
New-Item -ItemType Directory -Force -Path $destination | Out-Null
Copy-Item -Path (Join-Path $source "*") -Destination $destination -Recurse -Force
Set-Clipboard -Value $destination
Start-Process explorer.exe -ArgumentList $destination

$chromeCandidates = @(
    (Join-Path $env:ProgramFiles "Google\Chrome\Application\chrome.exe"),
    (Join-Path ${env:ProgramFiles(x86)} "Google\Chrome\Application\chrome.exe"),
    (Join-Path $env:LOCALAPPDATA "Google\Chrome\Application\chrome.exe")
)
$edgeCandidates = @(
    (Join-Path ${env:ProgramFiles(x86)} "Microsoft\Edge\Application\msedge.exe"),
    (Join-Path $env:ProgramFiles "Microsoft\Edge\Application\msedge.exe")
)
$chrome = $chromeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
$edge = $edgeCandidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
if ($chrome) { Start-Process $chrome -ArgumentList "chrome://extensions" }
elseif ($edge) { Start-Process $edge -ArgumentList "edge://extensions" }

Write-Host "Extension copied to $destination"
Write-Host "Enable Developer mode, click Load unpacked, then paste the copied path."
