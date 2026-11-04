$ErrorActionPreference = 'Stop'
$projectRoot = $PSScriptRoot

function Invoke-Npm {
  param([string[]]$Arguments)

  & npm @Arguments
  if ($LASTEXITCODE -ne 0) {
    throw "npm $($Arguments -join ' ') failed with exit code $LASTEXITCODE."
  }
}

$signingCertPath = $env:KITABUPOS_SIGNING_CERT_PATH
$signingCertPassword = $env:KITABUPOS_SIGNING_CERT_PASSWORD
$hasSigningCertPath = -not [string]::IsNullOrWhiteSpace($signingCertPath)
$hasSigningCertPassword = -not [string]::IsNullOrWhiteSpace($signingCertPassword)

if ($hasSigningCertPath -ne $hasSigningCertPassword) {
  throw 'Set both KITABUPOS_SIGNING_CERT_PATH and KITABUPOS_SIGNING_CERT_PASSWORD to sign the installer, or leave both unset.'
}
if ($hasSigningCertPath -and -not (Test-Path -LiteralPath $signingCertPath -PathType Leaf)) {
  throw "Signing certificate file not found: $signingCertPath"
}

Push-Location $projectRoot
try {
  if (-not (Test-Path -LiteralPath 'package-lock.json' -PathType Leaf)) {
    throw 'package-lock.json is required for a reproducible build. Run npm install to create it.'
  }

  Invoke-Npm -Arguments @('ci', '--no-audit', '--no-fund')
  Invoke-Npm -Arguments @('run', 'clean')

  $iconPath = Join-Path $projectRoot 'build\icon.ico'
  $iconSource = Join-Path $projectRoot 'assets\branding\app_icon_teal_1024.png'
  New-Item -ItemType Directory -Path (Split-Path -Parent $iconPath) -Force | Out-Null
  & node (Join-Path $projectRoot 'scripts\build-installer-icon.mjs') $iconSource $iconPath
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to generate the Windows application icon (exit code $LASTEXITCODE)."
  }

  Invoke-Npm -Arguments @('run', 'build')
  Invoke-Npm -Arguments @('run', 'build:electron')

  if ($hasSigningCertPath) {
    $env:CSC_LINK = (Resolve-Path -LiteralPath $signingCertPath).Path
    $env:CSC_KEY_PASSWORD = $signingCertPassword
  } else {
    Remove-Item Env:CSC_LINK -ErrorAction SilentlyContinue
    Remove-Item Env:CSC_KEY_PASSWORD -ErrorAction SilentlyContinue
    Write-Warning 'Building an unsigned installer. SmartScreen may show an unrecognized-app warning.'
  }

  & npm exec -- electron-builder --win nsis --x64
  $buildExitCode = $LASTEXITCODE
  if ($buildExitCode -ne 0) {
    Get-ChildItem -LiteralPath (Join-Path $projectRoot 'release') -Filter 'KitabuPOS-Setup-*.exe' -File -ErrorAction SilentlyContinue |
      Remove-Item -Force
    throw "electron-builder failed with exit code $buildExitCode; no installer was produced."
  }

  $installer = Get-ChildItem -LiteralPath (Join-Path $projectRoot 'release') -Filter 'KitabuPOS-Setup-*.exe' -File |
    Select-Object -First 1
  if (-not $installer) {
    throw 'electron-builder completed without producing KitabuPOS-Setup-*.exe.'
  }

  $appAsar = Join-Path $projectRoot 'release\win-unpacked\resources\app.asar'
  $asarCommand = Join-Path $projectRoot 'node_modules\.bin\asar.cmd'
  if (-not (Test-Path -LiteralPath $appAsar -PathType Leaf) -or
      -not (Test-Path -LiteralPath $asarCommand -PathType Leaf)) {
    throw 'The packaged app archive or ASAR inspection tool is missing.'
  }
  $asarEntries = & $asarCommand list $appAsar
  if ($LASTEXITCODE -ne 0) {
    throw "Failed to inspect packaged app contents (exit code $LASTEXITCODE)."
  }
  $unexpectedEntry = $asarEntries |
    Where-Object { $_ -notmatch '^\\(dist|dist-electron|package\.json)(\\|$)' } |
    Select-Object -First 1
  if ($unexpectedEntry) {
    throw "Unexpected non-runtime file in packaged app: $unexpectedEntry"
  }
  foreach ($requiredEntry in @('\dist\index.html', '\dist-electron\main.js', '\dist-electron\preload.cjs', '\package.json')) {
    if ($requiredEntry -notin $asarEntries) {
      throw "Required packaged app file is missing: $requiredEntry"
    }
  }
  Write-Output "Verified minimal app archive: $($asarEntries.Count) entries; source files and node_modules are excluded."

  if ($hasSigningCertPath) {
    $signature = Get-AuthenticodeSignature -LiteralPath $installer.FullName
    if ($signature.Status -ne 'Valid') {
      throw "Installer signature verification failed: $($signature.Status)."
    }
    Write-Output "Verified signed installer: $($installer.FullName)"
  } else {
    Write-Output "Unsigned installer created: $($installer.FullName)"
  }
} finally {
  Pop-Location
}
