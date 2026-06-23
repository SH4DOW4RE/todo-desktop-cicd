const { app, BrowserWindow, ipcMain, autoUpdater, dialog } = require("electron");
const path = require("node:path");
const isSquirrelStartup = require("electron-squirrel-startup");

const { initializeTodoApi } = require('./api/main-process');

if (isSquirrelStartup) app.quit();

const UPDATE_REPOSITORY = "SH4DOW4RE/todo-desktop-cicd";
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

function configureAutoUpdates() {
  if (!app.isPackaged || !["darwin", "win32"].includes(process.platform)) return;

  const feedUrl = `https://update.electronjs.org/${UPDATE_REPOSITORY}/${process.platform}-${process.arch}/${app.getVersion()}`;
  autoUpdater.setFeedURL({ url: feedUrl });

  autoUpdater.on("update-downloaded", async (_event, releaseNotes, releaseName) => {
    const { response } = await dialog.showMessageBox({
      type: "info",
      buttons: ["Restart now", "Later"],
      defaultId: 0,
      cancelId: 1,
      title: "Update ready",
      message: `${releaseName || "A new version"} has been downloaded.`,
      detail: "Restart the app to install the update."
    });

    if (response === 0) autoUpdater.quitAndInstall();
  });

  autoUpdater.on("error", error => {
    console.error("Auto-update failed:", error);
  });

  autoUpdater.checkForUpdates();
  setInterval(() => autoUpdater.checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);
}


const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 100,
    minHeight: 100,
    icon: "./icon.ico",
    frame: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      devTools: true,
    },
  });

  win.loadFile("index.html");

  return win;
}


app.whenReady().then(() => {
  initializeTodoApi();
  const win = createWindow();
  configureAutoUpdates();

  ipcMain.handle("window_minimize", (event) => {
    win.minimize();
  });
  ipcMain.handle("window_maximize", (event) => {
    if (win.isMaximized()) { win.unmaximize(); }
    else { win.maximize(); }
  });
  ipcMain.handle("window_close", (event) => {
    app.quit();
  });
  ipcMain.handle("window_is_maximized", (event) => {
    return win.isMaximized();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
})
