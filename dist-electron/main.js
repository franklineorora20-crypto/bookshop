var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// electron/main.ts
var import_electron = require("electron");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var mainWindow = null;
var appDataPath = import_electron.app.getPath("userData");
var dbDirectory = import_path.default.join(appDataPath, "KitabuPOS_Data");
if (!import_fs.default.existsSync(dbDirectory)) {
  import_fs.default.mkdirSync(dbDirectory, { recursive: true });
}
function createWindow() {
  mainWindow = new import_electron.BrowserWindow({
    width: 1366,
    height: 850,
    minWidth: 1024,
    minHeight: 700,
    title: "KitabuPOS - Offline Bookshop Management System",
    webPreferences: {
      preload: import_path.default.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    },
    show: false,
    backgroundColor: "#f8fafc"
  });
  mainWindow.maximize();
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
  });
  const devUrl = process.env.VITE_DEV_SERVER_URL || "http://localhost:3000";
  if (process.env.NODE_ENV === "development") {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(import_path.default.join(__dirname, "../dist/index.html"));
  }
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http:") || url.startsWith("https:")) {
      import_electron.shell.openExternal(url);
    }
    return { action: "deny" };
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}
import_electron.app.whenReady().then(() => {
  createWindow();
  import_electron.app.on("activate", () => {
    if (import_electron.BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});
import_electron.app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    import_electron.app.quit();
  }
});
import_electron.ipcMain.handle("app:get-paths", async () => {
  return {
    userData: appDataPath,
    dbPath: import_path.default.join(dbDirectory, "kitabupos.sqlite")
  };
});
import_electron.ipcMain.handle("backup:select-folder", async () => {
  if (!mainWindow) return null;
  const result = await import_electron.dialog.showOpenDialog(mainWindow, {
    title: "Select Backup Destination Folder (e.g., USB Drive)",
    properties: ["openDirectory", "createDirectory"]
  });
  return result.canceled ? null : result.filePaths[0];
});
import_electron.ipcMain.handle("backup:save-file", async (_event, defaultName, binaryData) => {
  if (!mainWindow) return { success: false, error: "No active window" };
  const result = await import_electron.dialog.showSaveDialog(mainWindow, {
    title: "Save KitabuPOS Database Backup",
    defaultPath: defaultName,
    filters: [{ name: "SQLite Database", extensions: ["sqlite", "db"] }]
  });
  if (result.canceled || !result.filePath) {
    return { success: false, error: "Cancelled by user" };
  }
  try {
    import_fs.default.writeFileSync(result.filePath, Buffer.from(binaryData));
    return { success: true, filePath: result.filePath };
  } catch (err) {
    return { success: false, error: err.message };
  }
});
import_electron.ipcMain.handle("print:receipt", async () => {
  if (!mainWindow) return false;
  mainWindow.webContents.print({
    silent: false,
    printBackground: true
  });
  return true;
});
