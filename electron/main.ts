/**
 * Electron Main Process for KitabuPOS Offline Bookshop Management System
 * Configured for secure Windows desktop deployment with offline SQLite.
 */
import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import path from 'path';
import fs from 'fs';

let mainWindow: BrowserWindow | null = null;

// Ensure database folder exists under user application data (separate from installation directory)
const appDataPath = app.getPath('userData');
const dbDirectory = path.join(appDataPath, 'KitabuPOS_Data');
if (!fs.existsSync(dbDirectory)) {
  fs.mkdirSync(dbDirectory, { recursive: true });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: 'KitabuPOS - Offline Bookshop Management System',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
    },
    show: false,
    backgroundColor: '#f8fafc',
  });

  mainWindow.maximize();
  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  const devUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:3000';
  if (process.env.NODE_ENV === 'development') {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Open external links safely in system browser
  mainWindow.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (url.startsWith('http:') || url.startsWith('https:')) {
      shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  createWindow();

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

// IPC Handlers for Windows Native Desktop Integration
ipcMain.handle('app:get-paths', async () => {
  return {
    userData: appDataPath,
    dbPath: path.join(dbDirectory, 'kitabupos.sqlite'),
  };
});

ipcMain.handle('backup:select-folder', async () => {
  if (!mainWindow) return null;
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Backup Destination Folder (e.g., USB Drive)',
    properties: ['openDirectory', 'createDirectory'],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle('backup:save-file', async (_event: any, defaultName: string, binaryData: number[]) => {
  if (!mainWindow) return { success: false, error: 'No active window' };
  const result = await dialog.showSaveDialog(mainWindow, {
    title: 'Save KitabuPOS Database Backup',
    defaultPath: defaultName,
    filters: [{ name: 'SQLite Database', extensions: ['sqlite', 'db'] }],
  });

  if (result.canceled || !result.filePath) {
    return { success: false, error: 'Cancelled by user' };
  }

  try {
    fs.writeFileSync(result.filePath, Buffer.from(binaryData));
    return { success: true, filePath: result.filePath };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('print:receipt', async () => {
  if (!mainWindow) return false;
  mainWindow.webContents.print({
    silent: false,
    printBackground: true,
  });
  return true;
});
