import path from 'node:path';

import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';

import { createTemplateRenderer } from './core/routing/templateRenderer';
import { AppConfigStore } from './main/config/appConfigStore';
import { registerIpcHandlers } from './main/ipc/registerIpcHandlers';
import { loadBundledPresets } from './main/presets/loadBundledPresets';
import { routeIncomingUri } from './main/routing/routeIncomingUri';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

function findUriArg(argv: string[]): string | null {
  for (const arg of argv) {
    if (!arg) continue;
    if (arg.startsWith('--')) continue;
    const idx = arg.indexOf(':');
    if (idx > 0) return arg;
  }
  return null;
}

let mainWindow: BrowserWindow | null = null;

const createWindow = () => {
  if (mainWindow) return mainWindow;

  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    void mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let configStore: AppConfigStore | null = null;
const renderer = createTemplateRenderer();
const presets = () => loadBundledPresets(app.getVersion());

async function ensureStoresReady(): Promise<AppConfigStore> {
  if (configStore) return configStore;

  configStore = new AppConfigStore({
    userDataDir: app.getPath('userData'),
    appVersion: app.getVersion(),
  });
  await configStore.load();

  registerIpcHandlers({
    configStore,
    getPresets: presets,
    renderer,
  });

  return configStore;
}

async function handleUri(uri: string): Promise<boolean> {
  const store = await ensureStoresReady();
  const result = await routeIncomingUri(store, renderer, uri);

  if (result.type === 'routed') return true;

  // v1 behavior: open the window on routing failure. Later UI work will prefill
  // the test input and show diagnostics via IPC.
  const win = createWindow();
  win.show();
  win.focus();

  return false;
}

app.on('second-instance', (_event, argv) => {
  const uri = findUriArg(argv);
  if (!uri) return;
  void handleUri(uri);
});

void app.whenReady().then(async () => {
  const uri = findUriArg(process.argv);
  await ensureStoresReady();

  if (uri) {
    await handleUri(uri);
    return;
  }

  createWindow();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
