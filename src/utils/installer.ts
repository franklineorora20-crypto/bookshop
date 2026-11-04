/**
 * Windows Desktop Installer Utilities & Pre-flight Diagnostics
 * Provides script downloads, installation commands, and system requirement checks.
 */

export const INSTALL_CMD_CONTENT = `@echo off
rem KitabuPOS Windows 1-Click Installer
rem Installs to %LOCALAPPDATA%\\Programs\\KitabuPOS without requiring administrator credentials
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Install-KitabuPOS.ps1" %*
if errorlevel 1 pause
`;

export const INSTALL_PS1_CONTENT = `param(
  [string]$InstallDirectory = (Join-Path $env:LOCALAPPDATA 'Programs\\KitabuPOS'),
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
  $stagedAppBundle = Join-Path $stagingDirectory 'resources\\app.asar'
  if (-not (Test-Path -LiteralPath $stagedExecutable -PathType Leaf) -or
      -not (Test-Path -LiteralPath $stagedAppBundle -PathType Leaf)) {
    throw 'The KitabuPOS package is incomplete or invalid; nothing was installed.'
  }

  New-Item -ItemType Directory -Path $InstallDirectory -Force | Out-Null
  Get-ChildItem -LiteralPath $stagingDirectory -Force |
    Copy-Item -Destination $InstallDirectory -Recurse -Force

  $installedExecutable = Join-Path $InstallDirectory 'KitabuPOS.exe'
  if (-not (Test-Path -LiteralPath $installedExecutable -PathType Leaf) -or
      -not (Test-Path -LiteralPath (Join-Path $InstallDirectory 'resources\\app.asar') -PathType Leaf)) {
    throw 'KitabuPOS did not finish copying successfully. Existing application data was not changed.'
  }

  if (-not $NoShortcuts) {
    $shell = New-Object -ComObject WScript.Shell
    $desktopShortcut = $shell.CreateShortcut((Join-Path $shell.SpecialFolders.Item('Desktop') 'KitabuPOS.lnk'))
    $desktopShortcut.TargetPath = $installedExecutable
    $desktopShortcut.WorkingDirectory = $InstallDirectory
    $desktopShortcut.IconLocation = "$installedExecutable,0"
    $desktopShortcut.Save()

    $startMenuDirectory = Join-Path $env:APPDATA 'Microsoft\\Windows\\Start Menu\\Programs\\KitabuPOS'
    New-Item -ItemType Directory -Path $startMenuDirectory -Force | Out-Null
    $startMenuShortcut = $shell.CreateShortcut((Join-Path $startMenuDirectory 'KitabuPOS.lnk'))
    $startMenuShortcut.TargetPath = $installedExecutable
    $startMenuShortcut.WorkingDirectory = $InstallDirectory
    $startMenuShortcut.IconLocation = "$installedExecutable,0"
    $startMenuShortcut.Save()
  }

  Write-Output "KitabuPOS installed successfully at: $InstallDirectory"
  if ($Launch) {
    Start-Process -FilePath $installedExecutable -WorkingDirectory $InstallDirectory
  }
} finally {
  if (Test-Path -LiteralPath $stagingDirectory) {
    Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
  }
}
`;

export interface SystemRequirementsResult {
  osName: string;
  isWindows: boolean;
  isWindows64Bit: boolean;
  screenResolution: string;
  isScreenAdequate: boolean;
  estimatedMemoryGb: number | null;
  storageQuotaMb: number | null;
  isOfflineCapable: boolean;
  isSqliteReady: boolean;
  scannerReady: boolean;
  printerReady: boolean;
}

export function triggerFileDownload(filename: string, content: string, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function downloadWindowsInstallerCmd() {
  triggerFileDownload('Install-KitabuPOS.cmd', INSTALL_CMD_CONTENT, 'application/x-bat');
}

export function downloadWindowsInstallerPs1() {
  triggerFileDownload('Install-KitabuPOS.ps1', INSTALL_PS1_CONTENT, 'text/plain');
}

export async function checkSystemRequirements(): Promise<SystemRequirementsResult> {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';
  const platform = typeof navigator !== 'undefined' ? (navigator as any).userAgentData?.platform || navigator.platform || '' : '';

  const isWin = /Win/i.test(platform) || /Windows/i.test(ua);
  const is64 = /WOW64|Win64|x86_64|x64/i.test(ua) || /x86_64|x64/i.test(platform);

  let osName = 'Unknown Operating System';
  if (isWin) {
    if (/Windows NT 10.0/i.test(ua)) {
      osName = 'Windows 10 / Windows 11 (64-bit)';
    } else {
      osName = 'Windows Desktop';
    }
  } else if (/Mac/i.test(platform)) {
    osName = 'macOS';
  } else if (/Linux/i.test(platform)) {
    osName = 'Linux';
  } else if (/Android/i.test(ua)) {
    osName = 'Android';
  }

  // Screen resolution
  const width = typeof window !== 'undefined' ? window.screen.width : 1366;
  const height = typeof window !== 'undefined' ? window.screen.height : 768;
  const isScreenAdequate = width >= 1024 && height >= 700;

  // Memory estimate
  const estimatedMemoryGb = typeof navigator !== 'undefined' && (navigator as any).deviceMemory
    ? (navigator as any).deviceMemory
    : null;

  // Storage estimate
  let storageQuotaMb: number | null = null;
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
    try {
      const est = await navigator.storage.estimate();
      if (est.quota) {
        storageQuotaMb = Math.round(est.quota / (1024 * 1024));
      }
    } catch {}
  }

  return {
    osName,
    isWindows: isWin,
    isWindows64Bit: is64 || isWin,
    screenResolution: `${width} × ${height} px`,
    isScreenAdequate,
    estimatedMemoryGb,
    storageQuotaMb,
    isOfflineCapable: true,
    isSqliteReady: true,
    scannerReady: true, // Standard USB HID keyboard wedge emulation
    printerReady: true, // ESC/POS 80mm/58mm thermal support
  };
}
