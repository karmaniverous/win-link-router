/**
 * Requirements addressed:
 * - Support normal launch (open UI) and protocol launch (route URI argument).
 * - Single-instance routing (second instance forwards URI to first).
 * - Persist a minimal per-user routing log for debugging.
 */
import path from 'node:path';

import { app, BrowserWindow } from 'electron';
import started from 'electron-squirrel-startup';

import { createTemplateRenderer } from './core/routing/templateRenderer';
import { findUriArg } from './main/argv/findUriArg';
import { AppConfigStore } from './main/config/appConfigStore';
import { registerIpcHandlers } from './main/ipc/registerIpcHandlers';
import { RouteLogStore } from './main/logging/routeLogStore';
import { loadBundledPresets } from './main/presets/loadBundledPresets';
import { setLastRouteError } from './main/routing/lastRouteError';
import { routeIncomingUri } from './main/routing/routeIncomingUri';
import { applyRunAtLoginSetting } from './main/settings/applyRunAtLogin';
import { createTrayController } from './main/tray/trayController';
import { maybePromptDefaultHandlerMismatch } from './main/windows/maybePromptDefaultHandlerMismatch';
import { ensureCandidateRegistration } from './main/windows/protocolRegistration';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let trayActive = false;
let isQuitting = false;

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
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('close', (event) => {
    if (!isQuitting && trayActive) {
      event.preventDefault();
      mainWindow?.hide();
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

function toggleMainWindow() {
  const win = createWindow();
  if (win.isVisible()) {
    win.hide();
  } else {
    win.show();
    win.focus();
  }
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let configStore: AppConfigStore | null = null;
let routeLogStore: RouteLogStore | null = null;
const renderer = createTemplateRenderer();
const presets = () => loadBundledPresets(app.getVersion());

async function ensureStoresReady(): Promise<AppConfigStore> {
  if (configStore) return configStore;

  configStore = new AppConfigStore({
    userDataDir: app.getPath('userData'),
    appVersion: app.getVersion(),
  });
  await configStore.load();

  const loaded = configStore.getLoadedConfig();
  const desiredLogMode = loaded.settings.routeLogMode ?? 'redacted';

  const logStore = (routeLogStore ??= new RouteLogStore({
    userDataDir: app.getPath('userData'),
    mode: desiredLogMode,
  }));
  logStore.setMode(desiredLogMode);

  registerIpcHandlers({
    configStore,
    logStore,
    getPresets: presets,
    renderer,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    exePath: process.execPath,
  });

  applyRunAtLoginSetting(configStore.getLoadedConfig());

  // Best-effort: ensure we're registered as a candidate handler for enabled schemes.
  // This does not set defaults; it only makes the app available in Default Apps.
  void ensureCandidateRegistration({
    isPackaged: app.isPackaged,
    exePath: process.execPath,
    appDisplayName: 'win-link-router',
    appDescription: 'Routes protocol links to configured targets',
    enabledSchemes: configStore
      .getLoadedConfig()
      .schemes.filter((s) => s.enabled)
      .map((s) => s.scheme),
  }).catch(() => undefined);

  return configStore;
}

async function handleUri(uri: string): Promise<boolean> {
  const store = await ensureStoresReady();
  const result = await routeIncomingUri(store, renderer, uri);

  await routeLogStore?.append(result).catch(() => undefined);

  if (result.type === 'routed') return true;

  setLastRouteError({
    when: new Date().toISOString(),
    uri,
    result,
  });

  // v1 behavior: open the window on routing failure. Later UI work will prefill
  // the test input and show diagnostics via IPC.
  const win = createWindow();
  win.show();
  win.focus();

  return false;
}

app.on('second-instance', (_event, argv) => {
  const uri = findUriArg(argv);
  if (uri) {
    void handleUri(uri).catch(() => undefined);
    return;
  }

  // If the app is already running (likely in tray) and the user launches it
  // again without a URI, show/focus the main window.
  void app.whenReady().then(() => {
    const win = createWindow();
    win.show();
    win.focus();
  });
});

void app.whenReady().then(async () => {
  const uri = findUriArg(process.argv);
  await ensureStoresReady();

  const tray = await createTrayController({
    onToggleMainWindow: toggleMainWindow,
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });
  trayActive = tray !== null;

  if (uri) {
    await handleUri(uri);
    return;
  }

  const win = createWindow();
  win.show();
  win.focus();

  void maybePromptDefaultHandlerMismatch(
    (configStore ?? (await ensureStoresReady())).getLoadedConfig(),
    {
      exePath: process.execPath,
    },
  ).catch(() => undefined);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (!trayActive) {
      app.quit();
    }
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
