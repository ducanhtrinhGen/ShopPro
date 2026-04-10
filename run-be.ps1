$ErrorActionPreference = "Stop"

function Resolve-JavaHome {
  if ($env:JAVA_HOME -and (Test-Path (Join-Path $env:JAVA_HOME "bin\javac.exe"))) {
    return $env:JAVA_HOME
  }

  $knownPath = "C:\Program Files\Eclipse Adoptium\jdk-25.0.1.8-hotspot"
  if (Test-Path (Join-Path $knownPath "bin\javac.exe")) {
    return $knownPath
  }

  $candidates = Get-ChildItem "C:\Program Files\Eclipse Adoptium" -Directory -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -like "jdk*" } |
    Sort-Object Name -Descending

  foreach ($candidate in $candidates) {
    $candidateJavaHome = $candidate.FullName
    if (Test-Path (Join-Path $candidateJavaHome "bin\javac.exe")) {
      return $candidateJavaHome
    }
  }

  return $null
}

$javaHome = Resolve-JavaHome
if (-not $javaHome) {
  Write-Error "Khong tim thay JDK. Cai JDK 17+ roi chay lai."
  exit 1
}

$env:JAVA_HOME = $javaHome
if (-not $env:Path.StartsWith("$javaHome\bin", [System.StringComparison]::OrdinalIgnoreCase)) {
  $env:Path = "$javaHome\bin;$env:Path"
}

Push-Location (Join-Path $PSScriptRoot "be")
try {
  & ".\mvnw.cmd" "spring-boot:run" "-Dspring-boot.run.arguments=--server.port=8080"
  $exitCode = $LASTEXITCODE
  if ($null -ne $exitCode -and $exitCode -ne 0) {
    exit $exitCode
  }
} finally {
  Pop-Location
}
