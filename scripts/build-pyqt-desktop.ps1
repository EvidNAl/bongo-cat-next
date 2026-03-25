Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$appDir = Join-Path $root "apps/desktop-pyqt"
$venvDir = Join-Path $root ".venv-pyqt"
$pythonExe = Join-Path $venvDir "Scripts/python.exe"
$iconPath = Join-Path $root "apps/desktop/src-tauri/icons/icon.ico"
$trayPath = Join-Path $root "apps/desktop/src-tauri/assets/tray.png"
$assetDir = Join-Path $appDir "assets"
$buildDir = Join-Path $appDir "build"
$specDir = Join-Path $appDir "pyinstaller"

if (-not (Test-Path $pythonExe)) {
  python -m venv $venvDir
}

& $pythonExe -m pip install --disable-pip-version-check --upgrade pip
& $pythonExe -m pip install --disable-pip-version-check -r (Join-Path $appDir "requirements.txt")

$version = & $pythonExe -c "import sys; sys.path.insert(0, r'$appDir'); from my_pet_assistant.config import APP_VERSION; print(APP_VERSION)"
$version = $version.Trim()

if (-not $version) {
  throw "Unable to read APP_VERSION from PyQt app."
}

Get-ChildItem -LiteralPath $root -File |
  Where-Object { $_.Name -like 'My Pet Assistant_*' -or $_.Name -eq 'bongo-cat-next.exe' } |
  Remove-Item -Force

Remove-Item -LiteralPath $buildDir -Recurse -Force -ErrorAction SilentlyContinue
Remove-Item -LiteralPath $specDir -Recurse -Force -ErrorAction SilentlyContinue

$appName = "My Pet Assistant_${version}_pyqt5_win11_x64"

& $pythonExe -m PyInstaller `
  --noconfirm `
  --clean `
  --noconsole `
  --onefile `
  --icon $iconPath `
  --add-data "${iconPath};assets" `
  --add-data "${trayPath};assets" `
  --add-data "${assetDir};assets" `
  --name $appName `
  --distpath $root `
  --workpath $buildDir `
  --specpath $specDir `
  (Join-Path $appDir "main.py")
