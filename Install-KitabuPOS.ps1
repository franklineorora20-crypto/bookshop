param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\KitabuPOS'),
  [switch]$NoShortcuts,
  [switch]$Launch
)

$ErrorActionPreference = 'Stop'
$archivePath = Join-Path $PSScriptRoot 'KitabuPOS-Portable-x64.zip'

if (-not (Test-Path -LiteralPath $archivePath -PathType Leaf)) {
  throw "The KitabuPOS package was not found beside this installer: $archivePath"
}

$stagingDirectory = Join-Path $env:TEMP ("KitabuPOS-install-" + [guid]::NewGuid().ToString('N'))

try {
  Expand-Archive -LiteralPath $archivePath -DestinationPath $stagingDirectory

  $stagedExecutable = Join-Path $stagingDirectory 'KitabuPOS.exe'
  $stagedAppBundle = Join-Path $stagingDirectory 'resources\app.asar'
  if (-not (Test-Path -LiteralPath $stagedExecutable -PathType Leaf) -or
      -not (Test-Path -LiteralPath $stagedAppBundle -PathType Leaf)) {
    throw 'The KitabuPOS package is incomplete or invalid; nothing was installed.'
  }

  New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
  Get-ChildItem -LiteralPath $stagingDirectory -Force |
    Copy-Item -Destination $InstallDirectory -Recurse -Force

  $installedExecutable = Join-Path $InstallDirectory 'KitabuPOS.exe'
  if (-not (Test-Path -LiteralPath $installedExecutable -PathType Leaf) -or
      -not (Test-Path -LiteralPath (Join-Path $InstallDirectory 'resources\app.asar') -PathType Leaf)) {
    throw 'KitabuPOS did not finish copying successfully. Existing application data was not changed.'
  }

  if (-not $NoShortcuts) {
    $shell = New-Object -ComObject WScript.Shell
    $desktopShortcut = $shell.CreateShortcut((Join-Path $shell.SpecialFolders.Item('Desktop') 'KitabuPOS.lnk'))
    $desktopShortcut.TargetPath = $installedExecutable
    $desktopShortcut.WorkingDirectory = $InstallDirectory
    $desktopShortcut.IconLocation = "$installedExecutable,0"
    $desktopShortcut.Save()

    $startMenuDirectory = Join-Path $env:APPDATA 'Microsoft\Windows\Start Menu\Programs\KitabuPOS'
    New-Item -ItemType Directory -Path $startMenuDirectory -Force | Out-Null
    $startMenuShortcut = $shell.CreateShortcut((Join-Path $startMenuDirectory 'KitabuPOS.lnk'))
    $startMenuShortcut.TargetPath = $installedExecutable
    $startMenuShortcut.WorkingDirectory = $InstallDirectory
    $startMenuShortcut.IconLocation = "$installedExecutable,0"
    $startMenuShortcut.Save()
  }

  Write-Output "KitabuPOS installed for this Windows account at: $InstallDirectory"
  if ($Launch) {
    Start-Process -FilePath $installedExecutable -WorkingDirectory $InstallDirectory
  }
} finally {
  if (Test-Path -LiteralPath $stagingDirectory) {
    Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
  }
}
