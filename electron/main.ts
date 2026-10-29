/**
 * Electron Main Process for KitabuPOS Offline Bookshop Management System
 * Configured for secure Windows desktop deployment with offline SQLite.
 */
import { app, BrowserWindow, ipcMain, dialog, shell, Menu, session } from 'electron';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// C1: Single Instance Lock - Quit immediately if another instance is already running
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Ensure persistent folders exist under user application data
const appDataPath = app.getPath('userData');
const dbDirectory = path.join(appDataPath, 'KitabuPOS_Data');
const backupDirectory = path.join(appDataPath, 'Backups');

for (const dir of [dbDirectory, backupDirectory]) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// B2: Rotation logic keeping 14 daily + 8 weekly backups
function rotateBackups(dir: string): void {
  try {
    if (!fs.existsSync(dir)) return;
    const allFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.sqlite') || f.endsWith('.db'));

    // Daily rotation (keep 14)
    const dailyFiles = allFiles
      .filter((f) => f.includes('_daily_'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (dailyFiles.length > 14) {
      for (const oldFile of dailyFiles.slice(14)) {
        try {
          fs.unlinkSync(path.join(dir, oldFile.name));
        } catch {}
      }
    }

    // Weekly rotation (keep 8)
    const weeklyFiles = allFiles
      .filter((f) => f.includes('_weekly_'))
      .map((f) => ({ name: f, time: fs.statSync(path.join(dir, f)).mtimeMs }))
      .sort((a, b) => b.time - a.time);

    if (weeklyFiles.length > 8) {
      for (const oldFile of weeklyFiles.slice(8)) {
        try {
          fs.unlinkSync(path.join(dir, oldFile.name));
        } catch {}
      }
    }
  } catch (err) {
    console.error('Failed to rotate backups:', err);
  }
}

// Quick SQLite binary header check
function verifySqliteHeader(buffer: Buffer): boolean {
  if (!buffer || buffer.length < 512) return false;
  const headerStr = buffer.subarray(0, 16).toString('utf-8');
  return headerStr === 'SQLite format 3\0';
}

function createWindow() {
  // Preload path: Built as CommonJS (preload.cjs)
  const preloadPath = path.join(__dirname, 'preload.cjs');

  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'KitabuPOS - Offline Bookshop Management System',
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      devTools: process.env.NODE_ENV === 'development',
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  // C1: Focus existing window on second-instance attempt
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  // C1: Deny all permission requests (camera, geolocation, notifications, etc.)
  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => {
    callback(false);
  });

  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
    // B2: Trigger startup backup check once UI is loaded
    setTimeout(() => {
      mainWindow?.webContents.send('backup:trigger-startup-check');
    }, 2000);
  });

  const isDev = process.env.NODE_ENV === 'development';
  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (isDev) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
    // C1: DevTools disabled in production
    mainWindow.webContents.closeDevTools();
  }

  // C1: Deny in-app navigation away from application
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    event.preventDefault();
    if (navigationUrl.startsWith('https:') || navigationUrl.startsWith('http:')) {
      shell.openExternal(navigationUrl);
    }
  });

  // C1: Deny new windows; open external https links in system default browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // B2: Trigger backup on app quit / window close
  mainWindow.on('close', (e) => {
    if (isQuitting) return;
    e.preventDefault();
    isQuitting = true;
    try {
      mainWindow?.webContents.send('app:quit-backup-requested');
      setTimeout(() => {
        app.exit(0);
      }, 1200);
    } catch {
      app.exit(0);
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  const menuTemplate: any[] = [
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
      ],
    },
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' },
        { role: 'zoom' },
        ...(process.platform === 'darwin'
          ? [{ type: 'separator' }, { role: 'front' }, { type: 'separator' }, { role: 'window' }]
          : [{ role: 'close' }]),
      ],
    },
  ];

  const menu = Menu.buildFromTemplate(menuTemplate);
  Menu.setApplicationMenu(menu);

  createWindow();

  // B2: Hourly backup trigger while app is running
  setInterval(() => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('backup:trigger-hourly-check');
    }
  }, 60 * 60 * 1000);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Sender Security Validation Helper
function validateIpcSender(event: Electron.IpcMainInvokeEvent): void {
  if (!mainWindow || event.senderFrame !== mainWindow.webContents.mainFrame) {
    throw new Error('Unauthorized IPC sender: frame origin mismatch.');
  }
}

// IPC Handlers
ipcMain.handle('app:get-paths', async (event) => {
  validateIpcSender(event);
  return {
    userData: appDataPath,
    dbPath: path.join(dbDirectory, 'kitabupos.sqlite'),
    backupDir: backupDirectory,
  };
});

ipcMain.handle('backup:select-folder', async (event) => {
  validateIpcSender(event);
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Secondary Backup Destination Folder (e.g. Flash Drive)',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle(
  'backup:write-auto-backup',
  async (
    event,
    rawBinary: Uint8Array | number[],
    secondFolder?: string,
    scheduleType: 'daily' | 'weekly' | 'manual' = 'daily'
  ) => {
    validateIpcSender(event);
    try {
      const buffer = Buffer.isBuffer(rawBinary)
        ? rawBinary
        : Buffer.from(rawBinary as any);

      if (!verifySqliteHeader(buffer)) {
        return { success: false, error: 'Database binary failed SQLite header validation.' };
      }

      const now = new Date();
      const pad = (n: number) => String(n).padStart(2, '0');
      const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
      const prefix = scheduleType === 'weekly' ? 'kitabupos_weekly' : 'kitabupos_daily';
      const filename = `${prefix}_${timestamp}.sqlite`;

      const primaryPath = path.join(backupDirectory, filename);
      fs.writeFileSync(primaryPath, buffer);

      // Perform rotation: keep 14 daily + 8 weekly
      rotateBackups(backupDirectory);

      // Optional second folder chosen in Settings
      if (secondFolder && typeof secondFolder === 'string' && fs.existsSync(secondFolder)) {
        try {
          const secondaryPath = path.join(secondFolder, filename);
          fs.copyFileSync(primaryPath, secondaryPath);
        } catch (copyErr) {
          console.warn('Failed to copy backup to secondary folder:', copyErr);
        }
      }

      return { success: true, filePath: primaryPath };
    } catch (err: any) {
      console.error('Automatic backup write error:', err);
      return { success: false, error: err.message };
    }
  }
);

ipcMain.handle('backup:quit-backup-save', async (event, rawBinary: Uint8Array | number[]) => {
  validateIpcSender(event);
  try {
    const buffer = Buffer.isBuffer(rawBinary)
      ? rawBinary
      : Buffer.from(rawBinary as any);
    if (verifySqliteHeader(buffer)) {
      const quitFile = path.join(backupDirectory, `kitabupos_quit_backup.sqlite`);
      fs.writeFileSync(quitFile, buffer);
    }
  } catch {}
  app.exit(0);
});

ipcMain.handle('backup:get-status', async (event) => {
  validateIpcSender(event);
  try {
    const files = fs.readdirSync(backupDirectory).filter((f) => f.endsWith('.sqlite') || f.endsWith('.db'));
    let latestTime: number | null = null;
    let latestFile: string | null = null;
    for (const f of files) {
      const stat = fs.statSync(path.join(backupDirectory, f));
      if (!latestTime || stat.mtimeMs > latestTime) {
        latestTime = stat.mtimeMs;
        latestFile = f;
      }
    }
    return {
      lastBackup: latestTime ? new Date(latestTime).toISOString() : null,
      latestFileName: latestFile,
      count: files.length,
      backupDir: backupDirectory,
    };
  } catch {
    return { lastBackup: null, count: 0, backupDir: backupDirectory };
  }
});

ipcMain.handle('backup:save-file', async (event, defaultName: string, rawBinary: Uint8Array | number[]) => {
  validateIpcSender(event);
  if (!mainWindow) return { success: false, error: 'No active window' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save KitabuPOS Database Backup',
    defaultPath: typeof defaultName === 'string' ? defaultName : 'kitabupos_backup.sqlite',
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    const buffer = Buffer.isBuffer(rawBinary)
      ? rawBinary
      : Buffer.from(rawBinary as any);
    if (!verifySqliteHeader(buffer)) {
      return { success: false, error: 'Database binary failed SQLite header validation.' };
    }
    fs.writeFileSync(result.filePath, buffer);
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print:receipt', async (event) => {
  validateIpcSender(event);
  if (!mainWindow) return false;
  mainWindow.webContents.print({
    silent: false,
    printBackground: true,
  });
  return true;
});
