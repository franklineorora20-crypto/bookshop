import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  isElectron: true,
  getAppPaths: () => ipcRenderer.invoke('app:get-paths'),
  selectBackupFolder: () => ipcRenderer.invoke('backup:select-folder'),
  saveBackupFile: (defaultName: string, binaryData: number[]) =>
    ipcRenderer.invoke('backup:save-file', defaultName, binaryData),
  printReceipt: () => ipcRenderer.invoke('print:receipt'),
});
