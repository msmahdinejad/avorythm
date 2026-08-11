param([switch]$SkipChecks)

$ErrorActionPreference = "Stop"
$repository = Split-Path -Parent $PSScriptRoot
$venvPython = Join-Path $repository ".venv\Scripts\python.exe"
$python = if (Test-Path -LiteralPath $venvPython) { $venvPython } else { "python" }
Push-Location $repository
try {
    if (-not $SkipChecks) {
        & $python -m pytest -q
        if ($LASTEXITCODE) { throw "Tests failed." }
        & $python -m ruff check src tests scripts
        if ($LASTEXITCODE) { throw "Lint failed." }
        & $python -m mypy src
        if ($LASTEXITCODE) { throw "Type checking failed." }
        node --test tests\extension.test.mjs tests\offscreen.test.mjs tests\background.test.mjs
        if ($LASTEXITCODE) { throw "Extension tests failed." }
    }

    & $python -m PyInstaller --noconfirm --clean --onedir `
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
