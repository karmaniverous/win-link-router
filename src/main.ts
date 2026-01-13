/**
 * Requirements addressed:
 * - Support normal launch (open UI) and protocol launch (route URI argument).
 * - Single-instance routing (second instance forwards URI to first).
 * - Persist a minimal per-user routing log for debugging.
 * - Reconcile Windows candidate registration to match per-scheme config intent.
 * - Lifecycle settings: Run in Background (tray) and Start on Windows Login.
 * - Avoid modal prompts for default-handler mismatch; prefer tray + UI banner.
 * - Open external http/https links in the system default browser.
 * - Provide a separate Share window (manual + nag) and show a post-route nag
 *   interstitial every N successful routes (NAG_INTERVAL).
 * - Persist nag state in a separate userData file; allow disabling nags.
 * - Share messages use scheme + template label (e.g. "WhatsApp Desktop").
 */
import path from 'node:path';

import { app, BrowserWindow, ipcMain, type Tray } from 'electron';
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
import { NAG_INTERVAL } from './main/share/shareNagConstants';
import { ShareNagStateStore } from './main/share/shareNagStateStore';
import {
  deriveShareSubjectFromConfig,
  deriveShareSubjectFromRouteResult,
} from './main/share/shareSubject';
import { buildShareUrl } from './main/share/shareUrls';
import {
  type ShareContext,
  ShareWindowController,
} from './main/share/shareWindowController';
import { createTrayController } from './main/tray/trayController';
import { applyExternalLinkHandling } from './main/windows/applyExternalLinkHandling';
import { ensureStartMenuShortcut } from './main/windows/ensureStartMenuShortcut';
import { maybeNotifyDefaultHandlerMismatch } from './main/windows/maybeNotifyDefaultHandlerMismatch';
import { openExternalUrl } from './main/windows/openExternalUrl';
import { ensureCandidateRegistration } from './main/windows/protocolRegistration';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let trayActive = false;
let isQuitting = false;

// Keep a reference to the Tray (when RIB is enabled) so routing-only launches can
// show best-effort notifications without opening the UI.
let trayRef: Tray | null = null;
let mismatchNotified = false;

let shareIpcRegistered = false;

function getDevServerOrigin(): string | null {
  if (!MAIN_WINDOW_VITE_DEV_SERVER_URL) return null;
  try {
    return new URL(MAIN_WINDOW_VITE_DEV_SERVER_URL).origin;
  } catch {
    return null;
  }
}

function getAllowedHttpOrigins(): string[] {
  const devOrigin = getDevServerOrigin();
  return devOrigin ? [devOrigin] : [];
}

async function loadShareView(win: BrowserWindow): Promise<void> {
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    void win.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?view=share`);
    return;
  }

  await win.loadFile(
    path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    { query: { view: 'share' } },
  );
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

  applyExternalLinkHandling(mainWindow, {
    allowedHttpOrigins: getAllowedHttpOrigins(),
  });

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
let shareNagStore: ShareNagStateStore | null = null;
let shareWindowController: ShareWindowController | null = null;
let currentShareContext: ShareContext | null = null;

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

  shareNagStore ??= new ShareNagStateStore({
    userDataDir: app.getPath('userData'),
  });
  shareWindowController ??= new ShareWindowController({
    getMainWindow: () => mainWindow,
    loadShareView,
    getAllowedHttpOrigins,
  });

  registerIpcHandlers({
    configStore,
    logStore,
    getPresets: presets,
    renderer,
    appVersion: app.getVersion(),
    isPackaged: app.isPackaged,
    exePath: process.execPath,
  });

  if (!shareIpcRegistered) {
    shareIpcRegistered = true;

    ipcMain.handle('share:open', async () => {
      const store = await ensureStoresReady();
      const nagStore = shareNagStore!;
      const winController = shareWindowController!;

      const state = await nagStore.read();
      const fromMru = state.lastSuccessful ?? null;

      let subject =
        fromMru && fromMru.scheme && fromMru.templateLabel
          ? { scheme: fromMru.scheme, templateLabel: fromMru.templateLabel }
          : deriveShareSubjectFromConfig(store.getLoadedConfig());

      subject ??= { scheme: 'TEL', templateLabel: 'a configured app' };

      currentShareContext = {
        mode: 'manual',
        scheme: subject.scheme,
        templateLabel: subject.templateLabel,
      };

      await winController.open(currentShareContext);
      return { ok: true as const };
    });

    ipcMain.handle('share:getContext', async () => {
      return { context: currentShareContext };
    });

    ipcMain.handle('share:later', async () => {
      shareWindowController?.close();
      return { ok: true as const };
    });

    ipcMain.handle('share:stopNagging', async () => {
      await shareNagStore?.setDisabled(true);
      shareWindowController?.close();
      return { ok: true as const };
    });

    ipcMain.handle('share:share', async (_event, platform: unknown) => {
      const ctx = currentShareContext;
      if (!ctx) throw new Error('Missing share context.');
      if (platform !== 'x' && platform !== 'linkedin') {
        throw new Error('Invalid share platform.');
      }

      // Close the share window before opening the external share URL so the
      // browser share ends up on top.
      shareWindowController?.close();

      const url = buildShareUrl({
        platform,
        scheme: ctx.scheme,
        templateLabel: ctx.templateLabel,
      });
      await openExternalUrl(url);
      return { ok: true as const };
    });
  }

  applyRunAtLoginSetting(configStore.getLoadedConfig());

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

async function recordSuccessAndMaybeNag(result: unknown): Promise<void> {
  const nagStore = shareNagStore;
  const winController = shareWindowController;
  const store = configStore;
  if (!nagStore || !winController || !store) return;

  const subject = deriveShareSubjectFromRouteResult(
    result as Parameters<typeof deriveShareSubjectFromRouteResult>[0],
  );
  if (!subject) return;

  const state = await nagStore.read();

  const nextCount = state.successfulRouteCount + 1;
  const nextState = {
    ...state,
    successfulRouteCount: nextCount,
    lastSuccessful: {
      scheme: subject.scheme,
      templateLabel: subject.templateLabel,
    },
  };
  await nagStore.write(nextState);

  if (nextState.disabled) return;
  if (nextCount % NAG_INTERVAL !== 0) return;

  // Post-route nag interstitial. The content is generic (no inline message),
  // but share actions use the scheme + template label for this route.
  currentShareContext = {
    mode: 'nag',
    scheme: subject.scheme,
    templateLabel: subject.templateLabel,
  };

  await winController.openNag(currentShareContext);

  // If the share window was dismissed, return to normal flow. (Window close
  // is treated as "Later".)
  void store;
}

async function handleUri(uri: string): Promise<boolean> {
  const store = await ensureStoresReady();
  const result = await routeIncomingUri(store, renderer, uri);

  await routeLogStore?.append(result).catch(() => undefined);

  if (result.type === 'routed') {
    await recordSuccessAndMaybeNag(result).catch(() => undefined);
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

  const loginSettings = app.getLoginItemSettings();
  const startedAtLogin = loginSettings.wasOpenedAtLogin;

  if (runInBackground) {
    const trayController = await createTrayController({
      onToggleMainWindow: toggleMainWindow,
      onQuit: () => {
        isQuitting = true;
        app.quit();
      },
    });
    trayActive = trayController !== null;
    trayRef = trayController?.tray ?? null;
  } else {
    trayActive = false;
    trayRef = null;
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
