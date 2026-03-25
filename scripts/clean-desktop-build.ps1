param(
  [string]$TargetDir = (Get-Location).Path
)

$directories = @(".next", "dist")

foreach ($directory in $directories) {
  $path = Join-Path $TargetDir $directory

  if (-not (Test-Path -LiteralPath $path)) {
    continue
  }

  $reparsePoints = Get-ChildItem -LiteralPath $path -Force -Recurse -ErrorAction SilentlyContinue |
    Where-Object { $_.Attributes -band [IO.FileAttributes]::ReparsePoint } |
    Sort-Object FullName -Descending

  foreach ($entry in $reparsePoints) {
    if ($entry.PSIsContainer) {
      cmd /c "rmdir /s /q `"$($entry.FullName)`"" | Out-Null
    } else {
      cmd /c "del /f /q `"$($entry.FullName)`"" | Out-Null
    }
  }

  Remove-Item -LiteralPath $path -Recurse -Force -ErrorAction SilentlyContinue

  if (Test-Path -LiteralPath $path) {
    cmd /c "rmdir /s /q `"$path`"" | Out-Null
  }
}
