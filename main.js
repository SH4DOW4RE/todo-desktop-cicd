const { app, BrowserWindow, ipcMain, autoUpdater, dialog, shell } = require("electron");
const path = require("node:path");
const isSquirrelStartup = require("electron-squirrel-startup");

const { initializeTodoApi } = require('./api/main-process');

if (isSquirrelStartup) app.quit();

const UPDATE_REPOSITORY = "SH4DOW4RE/todo-desktop-cicd";
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;
const LATEST_RELEASE_API_URL = `https://api.github.com/repos/${UPDATE_REPOSITORY}/releases/latest`;
const LATEST_RELEASE_URL = `https://github.com/${UPDATE_REPOSITORY}/releases/latest`;

function sendUpdateStatus(win, status, message) {
  if (!win.isDestroyed()) {
    win.webContents.send("app:update-status", { status, message });
  }
}

function configureWindowsAutoUpdates(win) {
  const feedUrl = `https://update.electronjs.org/${UPDATE_REPOSITORY}/win32-${process.arch}/${app.getVersion()}`;
  autoUpdater.setFeedURL({ url: feedUrl });

  autoUpdater.on("checking-for-update", () => {
    sendUpdateStatus(win, "checking", "Checking for updates…");
  });

  autoUpdater.on("update-available", () => {
    sendUpdateStatus(win, "downloading", "Downloading update…");
  });

  autoUpdater.on("update-not-available", () => {
    sendUpdateStatus(win, "current", "App is up to date");
  });

  autoUpdater.on("update-downloaded", async (_event, releaseNotes, releaseName) => {
    sendUpdateStatus(win, "ready", "Update ready to install");
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
    sendUpdateStatus(win, "error", `Update failed: ${error.message}`);
  });

  win.webContents.once("did-finish-load", () => autoUpdater.checkForUpdates());
  setInterval(() => autoUpdater.checkForUpdates(), UPDATE_CHECK_INTERVAL_MS);
}

function isNewerVersion(latestVersion, currentVersion) {
  const latestParts = latestVersion.replace(/^v/, "").split("-")[0].split(".").map(Number);
  const currentParts = currentVersion.replace(/^v/, "").split("-")[0].split(".").map(Number);
  const partCount = Math.max(latestParts.length, currentParts.length);

  for (let index = 0; index < partCount; index += 1) {
    const latestPart = latestParts[index] || 0;
    const currentPart = currentParts[index] || 0;
    if (latestPart !== currentPart) return latestPart > currentPart;
  }

  return false;
}

function configureManualUpdates(win) {
  let promptedVersion = null;

  const checkForUpdate = async () => {
    sendUpdateStatus(win, "checking", "Checking for updates…");

    try {
      const response = await fetch(LATEST_RELEASE_API_URL, {
        headers: {
          Accept: "application/vnd.github+json",
          "User-Agent": `Todo-Desktop-CICD/${app.getVersion()}`
        }
      });

      if (!response.ok) {
        throw new Error(`GitHub returned HTTP ${response.status}`);
      }

      const release = await response.json();
      if (!isNewerVersion(release.tag_name, app.getVersion())) {
        sendUpdateStatus(win, "current", "App is up to date");
        return;
      }

      sendUpdateStatus(win, "ready", `Version ${release.tag_name} is available`);
      if (promptedVersion === release.tag_name) return;
      promptedVersion = release.tag_name;

      const { response: selectedButton } = await dialog.showMessageBox(win, {
        type: "info",
        buttons: ["Download", "Later"],
        defaultId: 0,
        cancelId: 1,
        title: "Update available",
        message: `${release.tag_name} is available.`,
        detail: "Would you like to open the latest GitHub release and download the installer?"
      });

      if (selectedButton === 0) {
        await shell.openExternal(release.html_url || LATEST_RELEASE_URL);
      }
    } catch (error) {
      console.error("Update check failed:", error);
      sendUpdateStatus(win, "error", `Update check failed: ${error.message}`);
    }
  };

  win.webContents.once("did-finish-load", checkForUpdate);
  setInterval(checkForUpdate, UPDATE_CHECK_INTERVAL_MS);
}

function configureUpdates(win) {
  if (!app.isPackaged) return;
  if (process.platform === "win32") configureWindowsAutoUpdates(win);
  if (["darwin", "linux"].includes(process.platform)) configureManualUpdates(win);
}


const createWindow = () => {
  const win = new BrowserWindow({
    width: 1280,
    height: 720,
    minWidth: 100,
    minHeight: 100,
    icon: path.join(__dirname, "icon.png"),
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
  configureUpdates(win);

  ipcMain.handle("app:get-info", () => ({
    ok: true,
    data: {
      version: app.getVersion(),
      isPackaged: app.isPackaged
    }
  }));
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
