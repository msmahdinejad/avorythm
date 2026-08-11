param([switch]$SkipChecks)

$ErrorActionPreference = "Stop"
$repository = Split-Path -Parent $PSScriptRoot
Push-Location $repository
try {
    if (-not $SkipChecks) {
        python -m pytest -q
        if ($LASTEXITCODE) { throw "Tests failed." }
        python -m ruff check src tests scripts\*.py
        if ($LASTEXITCODE) { throw "Lint failed." }
    }

    python -m PyInstaller --noconfirm --clean --onedir `
        --name LingoDub `
        --icon extension\icons\LingoDub.ico `
        --paths src `
        --collect-all lingodub `
        --collect-all pyaudiowpatch `
        --hidden-import keyring.backends.Windows `
        scripts\launcher.py
    if ($LASTEXITCODE) { throw "PyInstaller failed." }

    $archive = Join-Path $repository "dist\LingoDub-Windows-x64.zip"
    if (Test-Path -LiteralPath $archive) { Remove-Item -LiteralPath $archive -Force }
    Compress-Archive -Path "dist\LingoDub\*" -DestinationPath $archive -CompressionLevel Optimal
}
finally {
    Pop-Location
}
