import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppPaths: () => ipcRenderer.invoke('app:get-paths'),
  selectBackupFolder: () => ipcRenderer.invoke('backup:select-folder'),
  saveBackupFile: (defaultName: string, binaryData: Uint8Array | number[]) =>
    ipcRenderer.invoke('backup:save-file', defaultName, binaryData),
  writeAutoBackup: (
    binaryData: Uint8Array | number[],
    secondFolder?: string,
    scheduleType?: 'daily' | 'weekly' | 'manual'
  ) => ipcRenderer.invoke('backup:write-auto-backup', binaryData, secondFolder, scheduleType),
  getBackupStatus: () => ipcRenderer.invoke('backup:get-status'),
  onQuitBackupRequested: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('app:quit-backup-requested', handler);
    return () => {
      ipcRenderer.removeListener('app:quit-backup-requested', handler);
    };
  },
  onBackupCheckRequested: (callback: (reason: string) => void) => {
    const h1 = () => callback('hourly');
    const h2 = () => callback('startup');
    ipcRenderer.on('backup:trigger-hourly-check', h1);
    ipcRenderer.on('backup:trigger-startup-check', h2);
    return () => {
      ipcRenderer.removeListener('backup:trigger-hourly-check', h1);
      ipcRenderer.removeListener('backup:trigger-startup-check', h2);
    };
  },
  sendQuitBackupComplete: (binaryData: Uint8Array | number[]) =>
    ipcRenderer.invoke('backup:quit-backup-save', binaryData),
  printReceipt: () => ipcRenderer.invoke('print:receipt'),
});
