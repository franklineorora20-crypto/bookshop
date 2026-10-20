// electron/preload.ts
var import_electron = require("electron");
import_electron.contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,
  getAppPaths: () => import_electron.ipcRenderer.invoke("app:get-paths"),
  selectBackupFolder: () => import_electron.ipcRenderer.invoke("backup:select-folder"),
  saveBackupFile: (defaultName, binaryData) => import_electron.ipcRenderer.invoke("backup:save-file", defaultName, binaryData),
  printReceipt: () => import_electron.ipcRenderer.invoke("print:receipt")
});
