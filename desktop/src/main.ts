import { app, BrowserWindow, shell, Menu, nativeTheme } from "electron";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appDir = path.join(__dirname, "..", "app");

let mainWindow: BrowserWindow | null = null;

function buildMenu(): void {
  const isMac = process.platform === "darwin";
  const template: Electron.MenuItemConstructorOptions[] = [
    ...(isMac ? [{ label: app.name, submenu: [{ role: "about" as const }, { type: "separator" as const }, { role: "quit" as const }] }] : []),
    {
      label: "File",
      submenu: [
        isMac ? { role: "close" as const } : { role: "quit" as const },
      ],
    },
    {
      label: "Edit",
      submenu: [
        { role: "undo" as const }, { role: "redo" as const },
        { type: "separator" as const },
        { role: "cut" as const }, { role: "copy" as const }, { role: "paste" as const },
        { role: "selectAll" as const },
      ],
    },
    {
      label: "View",
      submenu: [
        { role: "reload" as const },
        { type: "separator" as const },
        { role: "resetZoom" as const }, { role: "zoomIn" as const }, { role: "zoomOut" as const },
        { type: "separator" as const },
        { role: "togglefullscreen" as const },
        ...(process.env.NODE_ENV === "development"
          ? [{ type: "separator" as const }, { role: "toggleDevTools" as const }]
          : []),
      ],
    },
    {
      label: "Window",
      submenu: [
        { role: "minimize" as const },
        ...(isMac ? [{ role: "zoom" as const }] : []),
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 960,
    minHeight: 640,
    title: "Socratus",
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#1c1917" : "#faf8f4",
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Required for epubjs blob: URL rendering across the app's file:// origin
      webSecurity: false,
      spellcheck: true,
    },
  });

  // Load the built web app from the bundled app/ folder
  mainWindow.loadFile(path.join(appDir, "index.html")).catch((err) => {
    console.error("Failed to load app:", err);
  });

  // Show only once fully ready — prevents white flash
  mainWindow.once("ready-to-show", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });

  // Open anchor links that navigate away in the OS browser, not in app
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith("http://") || url.startsWith("https://")) {
      shell.openExternal(url);
    }
    return { action: "deny" };
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  buildMenu();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
