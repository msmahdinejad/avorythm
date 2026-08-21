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
        node --test tests\*.test.mjs
        if ($LASTEXITCODE) { throw "Extension tests failed." }
    }

    & $python scripts\build.py
    if ($LASTEXITCODE) { throw "Build failed." }
}
finally {
    Pop-Location
}
