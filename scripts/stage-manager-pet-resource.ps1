Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$root = Resolve-Path (Join-Path $PSScriptRoot "..")
$resourceDir = Join-Path $root "apps/desktop/src-tauri/resources/pet-app"

New-Item -ItemType Directory -Path $resourceDir -Force | Out-Null

Get-ChildItem -LiteralPath $resourceDir -File -ErrorAction SilentlyContinue |
  Remove-Item -Force

$petExe = Get-ChildItem -LiteralPath $root -File |
  Where-Object { $_.Name -like "My Pet Assistant_*_pyqt5_win11_x64.exe" } |
  Sort-Object LastWriteTime -Descending |
  Select-Object -First 1

if (-not $petExe) {
  throw "No PyQt5 desktop pet executable found in the project root. Build the pet app first."
}

$targetPath = Join-Path $resourceDir $petExe.Name
Copy-Item -LiteralPath $petExe.FullName -Destination $targetPath -Force

Write-Output "staged_pet_resource=$targetPath"
