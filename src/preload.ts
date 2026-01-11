/**
 * Requirements addressed:
 * - Keep OS/Electron side effects in main/preload; renderer remains UI-focused.
 * - UI must be able to load/save config and run debounced template tests.
 * - UI must support import/export and shared config settings management.
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
  },
  presets: {
    get: () => ipcRenderer.invoke('presets:get'),
  },
  test: {
    evaluate: (scheme: string, uri: string) =>
      ipcRenderer.invoke('test:evaluate', { scheme, uri }),
  },
});
