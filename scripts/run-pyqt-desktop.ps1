Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$appDir = Join-Path $root "apps/desktop-pyqt"
$venvDir = Join-Path $root ".venv-pyqt"
$pythonExe = Join-Path $venvDir "Scripts/python.exe"

if (-not (Test-Path $pythonExe)) {
  python -m venv $venvDir
}

& $pythonExe -m pip install --disable-pip-version-check -r (Join-Path $appDir "requirements.txt")
& $pythonExe (Join-Path $appDir "main.py")
