$ErrorActionPreference = 'Stop'
$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot '..')).Path
Push-Location $projectRoot

try {
  npm run build
  if ($LASTEXITCODE -ne 0) { throw 'Application build failed.' }

  npm run build:electron
  if ($LASTEXITCODE -ne 0) { throw 'Electron main/preload build failed.' }

  npx electron-builder --win dir --x64 --config.win.signAndEditExecutable=false
  if ($LASTEXITCODE -ne 0) { throw 'Windows application packaging failed.' }

  $releaseDirectory = Join-Path $projectRoot 'release'
  $appDirectory = Join-Path $releaseDirectory 'win-unpacked'
  if (-not (Test-Path -LiteralPath (Join-Path $appDirectory 'KitabuPOS.exe') -PathType Leaf) -or
      -not (Test-Path -LiteralPath (Join-Path $appDirectory 'resources\app.asar') -PathType Leaf)) {
    throw 'The packaged Windows application is incomplete.'
  }

  $portableArchive = Join-Path $releaseDirectory 'KitabuPOS-Portable-x64.zip'
  $bundleDirectory = Join-Path $releaseDirectory 'KitabuPOS-Windows-x64'
  $bundleArchive = Join-Path $releaseDirectory 'KitabuPOS-Windows-x64-Install.zip'

  foreach ($output in @($portableArchive, $bundleDirectory, $bundleArchive)) {
    if (Test-Path -LiteralPath $output) {
      Remove-Item -LiteralPath $output -Recurse -Force
    }
  }

  Compress-Archive -Path (Join-Path $appDirectory '*') -DestinationPath $portableArchive -CompressionLevel Fastest
  New-Item -ItemType Directory -Path $bundleDirectory | Out-Null
  Copy-Item (Join-Path $projectRoot 'Install-KitabuPOS.cmd'), (Join-Path $projectRoot 'Install-KitabuPOS.ps1'), $portableArchive -Destination $bundleDirectory
  Compress-Archive -Path (Join-Path $bundleDirectory '*') -DestinationPath $bundleArchive -CompressionLevel Fastest

  Write-Output "Windows per-user install bundle: $bundleArchive"
} finally {
  Pop-Location
}
