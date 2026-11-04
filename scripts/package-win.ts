/**
 * Cross-platform Windows Packaging Script for KitabuPOS
 * Builds Vite frontend, compiles Electron main/preload, and prepares
 * the Windows x64 distribution package.
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

function runStep(command: string, desc: string) {
  console.log(`\n[Packaging Step] ${desc}...`);
  console.log(`> ${command}`);
  execSync(command, { cwd: rootDir, stdio: 'inherit' });
}

async function packageWindows() {
  console.log('====================================================');
  console.log('   KitabuPOS Windows Desktop Installer Packager     ');
  console.log('====================================================');

  // 1. Clean previous build artifacts
  const releaseDir = path.join(rootDir, 'release');
  const distDir = path.join(rootDir, 'dist');
  const distElectronDir = path.join(rootDir, 'dist-electron');

  for (const dir of [distDir, distElectronDir, releaseDir]) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // 2. Ensure build/icon.ico exists for electron-builder
  const buildDir = path.join(rootDir, 'build');
  const iconPath = path.join(buildDir, 'icon.ico');
  const faviconPath = path.join(rootDir, 'public', 'favicon.ico');
  if (!fs.existsSync(buildDir)) {
    fs.mkdirSync(buildDir, { recursive: true });
  }
  if (!fs.existsSync(iconPath) && fs.existsSync(faviconPath)) {
    fs.copyFileSync(faviconPath, iconPath);
    console.log('[Icon] Synced build/icon.ico from public/favicon.ico');
  }

  // 3. Build Vite frontend
  runStep('npm run build', 'Compiling React Vite frontend');

  // 4. Build Electron main & preload
  runStep('npm run build:electron', 'Compiling Electron main and preload processes');

  // 5. Verify outputs
  const indexHtml = path.join(distDir, 'index.html');
  const mainJs = path.join(distElectronDir, 'main.js');
  if (!fs.existsSync(indexHtml) || !fs.existsSync(mainJs)) {
    throw new Error('Critical build artifacts missing (dist/index.html or dist-electron/main.js)');
  }

  // 6. Stage release bundle directory
  if (!fs.existsSync(releaseDir)) {
    fs.mkdirSync(releaseDir, { recursive: true });
  }

  const bundleDir = path.join(releaseDir, 'KitabuPOS-Windows-Installer');
  if (!fs.existsSync(bundleDir)) {
    fs.mkdirSync(bundleDir, { recursive: true });
  }

  // Copy installer scripts into bundle
  fs.copyFileSync(path.join(rootDir, 'Install-KitabuPOS.cmd'), path.join(bundleDir, 'Install-KitabuPOS.cmd'));
  fs.copyFileSync(path.join(rootDir, 'Install-KitabuPOS.ps1'), path.join(bundleDir, 'Install-KitabuPOS.ps1'));
  fs.copyFileSync(path.join(rootDir, 'INSTALLATION_GUIDE.md'), path.join(bundleDir, 'INSTALLATION_GUIDE.md'));

  // Create Quick Start Readme in bundle
  const quickStart = `================================================================================
KITABUPOS — OFFLINE BOOKSHOP MANAGEMENT SYSTEM FOR WINDOWS
================================================================================
Operating System: Windows 10 (64-bit) or Windows 11 (64-bit)
Architecture: x64 (Intel / AMD)

HOW TO INSTALL ON YOUR BOOKSHOP COUNTER PC:
--------------------------------------------------------------------------------
1. Right-click "Install-KitabuPOS.cmd" and choose "Run as administrator" (or double-click to install for current user).
2. The installer will automatically:
   - Deploy KitabuPOS into %LOCALAPPDATA%\\Programs\\KitabuPOS
   - Create a Desktop shortcut: "KitabuPOS Bookshop System"
   - Create a Start Menu shortcut
   - Require ZERO internet connection
3. Double-click the desktop shortcut to start.
4. On first launch, the 4-step wizard will prompt you for your bookshop name,
   contact phone, M-Pesa till number, and administrator password.

UNINSTALLATION / UPGRADES:
--------------------------------------------------------------------------------
- Business databases are saved separately in:
  %APPDATA%\\KitabuPOS\\KitabuPOS_Data and %APPDATA%\\KitabuPOS\\Backups
- Re-running the installer updates program files WITHOUT touching your records.
================================================================================
`;
  fs.writeFileSync(path.join(bundleDir, 'README-INSTALL.txt'), quickStart, 'utf-8');

  console.log('\n✅ Windows Installer bundle staged successfully at:');
  console.log(`   ${bundleDir}`);
  console.log('   Files present:');
  console.log('   - Install-KitabuPOS.cmd (1-click double-click launcher)');
  console.log('   - Install-KitabuPOS.ps1 (PowerShell installation engine)');
  console.log('   - README-INSTALL.txt (Quick start instructions for store staff)');
  console.log('   - INSTALLATION_GUIDE.md (Full hardware and peripheral manual)');
}

packageWindows().catch((err) => {
  console.error('[Packaging Failed]:', err);
  process.exit(1);
});
