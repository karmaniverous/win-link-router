/**
 * Requirements addressed:
 * - Support normal launch (open UI) and protocol launch (route URI argument).
 * - Single-instance routing (second instance forwards URI to first).
 * - Persist a minimal per-user routing log for debugging.
 * - Reconcile Windows candidate registration to match per-scheme config intent.
 * - Lifecycle settings: Run in Background (tray) and Start on Windows Login.
 * - Avoid modal prompts for default-handler mismatch; prefer tray + UI banner.
 * - Open external http/https links in the system default browser.
 * - Provide a separate Share window (manual + nag) and show a post-route nag.
 * - This app is Windows-only; do not implement macOS lifecycle behavior.
 * - Provide a modal About window with update status and controls.
 * - Implement auto-updates via update.electronjs.org (startup + hourly when enabled).
 * - Define a custom Windows application menu and remove boilerplate Help items.
 * - Apply Run in Background changes at runtime:
 *   - enabling RIB should create the tray immediately;
 *   - disabling RIB should destroy the tray immediately;
 *   - if the window is hidden (tray-only), show/focus the window before
 *     removing the tray so the app does not “disappear”.
 */
import path from 'node:path';

import { app, BrowserWindow, ipcMain, type Tray } from 'electron';
import started from 'electron-squirrel-startup';

import { createTemplateRenderer } from './core/routing/templateRenderer';
import { AboutWindowController } from './main/about/aboutWindowController';
import {
  getAllowedHttpOrigins,
  loadAboutView,
  loadMainView,
  loadShareView,
} from './main/app/rendererViews';
import { findUriArg } from './main/argv/findUriArg';
import { AppConfigStore } from './main/config/appConfigStore';
import { registerIpcHandlers } from './main/ipc/registerIpcHandlers';
import { RouteLogStore } from './main/logging/routeLogStore';
import { loadBundledPresets } from './main/presets/loadBundledPresets';
import { setLastRouteError } from './main/routing/lastRouteError';
import { routeIncomingUri } from './main/routing/routeIncomingUri';
import { applyRunAtLoginSetting } from './main/settings/applyRunAtLogin';
import { ShareRuntime } from './main/share/shareRuntime';
import { createTrayController } from './main/tray/trayController';
import { UpdateRuntime } from './main/updates/updateRuntime';
import { applyExternalLinkHandling } from './main/windows/applyExternalLinkHandling';
import { setWindowsAppMenu } from './main/windows/appMenu';
import { ensureStartMenuShortcut } from './main/windows/ensureStartMenuShortcut';
import { maybeNotifyDefaultHandlerMismatch } from './main/windows/maybeNotifyDefaultHandlerMismatch';
import { ensureCandidateRegistration } from './main/windows/protocolRegistration';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

const RENDERER_VIEWS = {
  devServerUrl: MAIN_WINDOW_VITE_DEV_SERVER_URL,
  baseDir: __dirname,
  viteName: MAIN_WINDOW_VITE_NAME,
};

let mainWindow: BrowserWindow | null = null;
let isQuitting = false;

// Keep a reference to the Tray (when RIB is enabled) so routing-only launches
// can show best-effort notifications without opening the UI.
let trayRef: Tray | null = null;
let trayController: { tray: Tray; destroy(): void } | null = null;
let mismatchNotified = false;

function getDevToolsEnabled(): boolean {
  return Boolean(RENDERER_VIEWS.devServerUrl);
}

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

  loadMainView(mainWindow, RENDERER_VIEWS);

  // Open the DevTools.
  if (getDevToolsEnabled()) {
    mainWindow.webContents.openDevTools();
  }

  applyExternalLinkHandling(mainWindow, {
    allowedHttpOrigins: getAllowedHttpOrigins(RENDERER_VIEWS.devServerUrl),
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting && trayController) {
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

async function enableTray(): Promise<{ ok: boolean; warnings: string[] }> {
  if (trayController) return { ok: true, warnings: [] };

  const controller = await createTrayController({
    onToggleMainWindow: toggleMainWindow,
    onQuit: () => {
      isQuitting = true;
      app.quit();
    },
  });

  if (!controller) {
    trayController = null;
    trayRef = null;
    return {
      ok: false,
      warnings: [
        'Failed to create a system tray icon. Try restarting the app, or toggle Run in Background off and on again.',
      ],
    };
  }

  trayController = controller;
  trayRef = controller.tray;
  return { ok: true, warnings: [] };
}

function disableTrayAndShowWindowIfHidden() {
  if (!trayController) return;

  // Per UX: if we are currently tray-only, show/focus the window before
  // removing the tray so the app does not “disappear”.
  const win = createWindow();
  if (!win.isVisible()) {
    win.show();
    win.focus();
  }

  trayController.destroy();
  trayController = null;
  trayRef = null;
}

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
}

let configStore: AppConfigStore | null = null;
let routeLogStore: RouteLogStore | null = null;
let shareRuntime: ShareRuntime | null = null;
let updateRuntime: UpdateRuntime | null = null;
let aboutWindowController: AboutWindowController | null = null;

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

  shareRuntime ??= new ShareRuntime({
    userDataDir: app.getPath('userData'),
    getMainWindow: () => mainWindow,
    loadShareView: (win) => loadShareView(win, RENDERER_VIEWS),
    getAllowedHttpOrigins: () =>
      getAllowedHttpOrigins(RENDERER_VIEWS.devServerUrl),
  });
  shareRuntime.registerIpc(ipcMain, {
    getConfig: () => {
      const store = configStore;
      if (!store) throw new Error('Config store is not ready.');
      return store.getLoadedConfig();
    },
  });

  updateRuntime ??= new UpdateRuntime({
    isPackaged: app.isPackaged,
    getCurrentVersion: () => app.getVersion(),
  });
  updateRuntime.registerIpc(ipcMain);

  aboutWindowController ??= new AboutWindowController({
    getMainWindow: () => mainWindow,
    loadAboutView: (win) => loadAboutView(win, RENDERER_VIEWS),
    getAllowedHttpOrigins: () =>
      getAllowedHttpOrigins(RENDERER_VIEWS.devServerUrl),
  });

  registerIpcHandlers({
    configStore,
    logStore,
    getPresets: presets,
    renderer,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    exePath: process.execPath,
    onSettingsChanged: async (nextSettings) => {
      updateRuntime?.applySettings(nextSettings);

      const runInBackground = nextSettings.runInBackground ?? false;
      if (runInBackground) {
        const tray = await enableTray();
        return tray.warnings.length ? { warnings: tray.warnings } : undefined;
      }

      disableTrayAndShowWindowIfHidden();
      return undefined;
    },
  });

  applyRunAtLoginSetting(configStore.getLoadedConfig());
  updateRuntime.applySettings(configStore.getLoadedConfig().settings);
  updateRuntime.start();

  // Best-effort: ensure a working Start Menu shortcut exists for the current
  // user. Squirrel installs per-user under %LOCALAPPDATA% and Start Menu items
  // are per-user as well.
  if (process.platform === 'win32' && app.isPackaged) {
    void ensureStartMenuShortcut({
      shortcutName: 'win-link-router',
      exePath: process.execPath,
    }).catch(() => undefined);
  }

  // Best-effort: reconcile candidate registration for enabled + registered schemes.
  // This does not set defaults; it only makes the app available in Default Apps.
  void ensureCandidateRegistration({
    isPackaged: app.isPackaged,
    exePath: process.execPath,
    appDisplayName: 'win-link-router',
    appDescription: 'Routes protocol links to configured targets',
    registeredSchemes: configStore
      .getLoadedConfig()
      .schemes.filter((s) => s.enabled && s.registered)
      .map((s) => s.scheme),
  }).catch(() => undefined);

  return configStore;
}

async function handleUri(uri: string): Promise<boolean> {
  const store = await ensureStoresReady();
  const result = await routeIncomingUri(store, renderer, uri);

  await routeLogStore?.append(result).catch(() => undefined);

  if (result.type === 'routed') {
    if (shareRuntime) {
      await shareRuntime.onSuccessfulRoute(result).catch(() => undefined);
    }

    // In routing-only mode, avoid modal prompts; show a best-effort tray balloon
    // once per process start if RIB is enabled.
    if (trayRef && !mismatchNotified) {
      mismatchNotified = true;
      void maybeNotifyDefaultHandlerMismatch({
        config: store.getLoadedConfig(),
        exePath: process.execPath,
        tray: trayRef,
      }).catch(() => undefined);
    }
    return true;
  }

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
  const store = await ensureStoresReady();
  const loaded = store.getLoadedConfig();
  const runInBackground = loaded.settings.runInBackground ?? false;

  setWindowsAppMenu({
    isDev: Boolean(MAIN_WINDOW_VITE_DEV_SERVER_URL),
    onOpenAbout: () => {
      void aboutWindowController?.open().catch(() => undefined);
    },
  });

  const loginSettings = app.getLoginItemSettings();
  const startedAtLogin = loginSettings.wasOpenedAtLogin;

  if (runInBackground) {
    await enableTray();
  }

  if (uri) {
    const ok = await handleUri(uri);
    if (ok && !runInBackground) {
      isQuitting = true;
      app.quit();
    }
    return;
  }

  if (runInBackground && loaded.settings.runAtLogin && startedAtLogin) {
    // Start hidden (tray only) when opened at login.
    if (trayRef && !mismatchNotified) {
      mismatchNotified = true;
      void maybeNotifyDefaultHandlerMismatch({
        config: loaded,
        exePath: process.execPath,
        tray: trayRef,
      }).catch(() => undefined);
    }
    return;
  }

  const win = createWindow();
  win.show();
  win.focus();
});

app.on('window-all-closed', () => {
  if (!trayController) app.quit();
});
