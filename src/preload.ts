/**
 * Requirements addressed:
 * - Keep OS/Electron side effects in main/preload; renderer remains UI-focused.
 * - UI must be able to load/save config and run debounced template tests.
 * - UI must support import/export and shared config settings management.
 * - UI must be able to display Windows registration/default status.
 * - UI must be able to prefill test input after routing failures.
 * - UI must be able to open external links (e.g., GitHub repo) via main.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('winLinkRouter', {
  appConfig: {
    get: () => ipcRenderer.invoke('appConfig:get'),
    set: (next: unknown) => ipcRenderer.invoke('appConfig:set', next),
    exportSchemes: () => ipcRenderer.invoke('appConfig:exportSchemes'),
    importSchemes: () => ipcRenderer.invoke('appConfig:importSchemes'),
  },
  settings: {
    set: (patch: unknown) => ipcRenderer.invoke('settings:set', patch),
    pickSharedConfigPath: () =>
      ipcRenderer.invoke('settings:pickSharedConfigPath'),
  },
  presets: {
    get: () => ipcRenderer.invoke('presets:get'),
  },
  windows: {
    ensureRegistration: () => ipcRenderer.invoke('windows:ensureRegistration'),
    getSchemeStatuses: () => ipcRenderer.invoke('windows:getSchemeStatuses'),
    openDefaultApps: (scheme?: string) =>
      ipcRenderer.invoke('windows:openDefaultApps', scheme),
    openExternal: (url: string) =>
      ipcRenderer.invoke('windows:openExternal', url),
  },
  routing: {
    getLastRouteError: () => ipcRenderer.invoke('routing:getLastRouteError'),
    clearLastRouteError: () =>
      ipcRenderer.invoke('routing:clearLastRouteError'),
  },
  routeLog: {
    get: () => ipcRenderer.invoke('routeLog:get'),
    clear: () => ipcRenderer.invoke('routeLog:clear'),
  },
  test: {
    evaluate: (scheme: string, uri: string) =>
      ipcRenderer.invoke('test:evaluate', { scheme, uri }),
  },
  share: {
    open: () => ipcRenderer.invoke('share:open'),
    getContext: () => ipcRenderer.invoke('share:getContext'),
    later: () => ipcRenderer.invoke('share:later'),
    stopNagging: () => ipcRenderer.invoke('share:stopNagging'),
    shareX: () => ipcRenderer.invoke('share:share', 'x'),
    shareLinkedIn: () => ipcRenderer.invoke('share:share', 'linkedin'),
  },
});
