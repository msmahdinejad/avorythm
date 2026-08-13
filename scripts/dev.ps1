$ErrorActionPreference = "Stop"
$repository = Split-Path -Parent $PSScriptRoot
$python = Join-Path $repository ".venv\Scripts\python.exe"

if (-not (Test-Path -LiteralPath $python)) {
    py -3.12 -m venv (Join-Path $repository ".venv")
}
& $python -m pip install -e "${repository}[dev]"
& $python -m lingora
