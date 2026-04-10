$ErrorActionPreference = "Stop"

Push-Location (Join-Path $PSScriptRoot "fe")
try {
  if (-not (Test-Path ".\node_modules")) {
    & "npm.cmd" "install"
  }

  & "npm.cmd" "run" "dev" "--" "--host" "127.0.0.1" "--port" "5173"
} finally {
  Pop-Location
}
