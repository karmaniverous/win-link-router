/**
 * Requirements addressed:
 * - Keep OS/Electron side effects in main/preload; renderer remains UI-focused.
 * - UI must be able to load/save config and run debounced template tests.
 */
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('winLinkRouter', {
  appConfig: {
    get: () => ipcRenderer.invoke('appConfig:get'),
    set: (next: unknown) => ipcRenderer.invoke('appConfig:set', next),
  },
  presets: {
    get: () => ipcRenderer.invoke('presets:get'),
  },
  test: {
    evaluate: (scheme: string, uri: string) =>
      ipcRenderer.invoke('test:evaluate', { scheme, uri }),
  },
});
