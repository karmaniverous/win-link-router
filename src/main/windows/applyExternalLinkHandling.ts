/**
 * Requirements addressed:
 * - Open external http/https links in the system default browser (not inside the app).
 * - Allow callers (e.g., share interstitial) to close themselves before opening external.
 */
import type { BrowserWindow } from 'electron';

import { shouldOpenUrlExternally } from './externalLinkPolicy';
import { openExternalUrl } from './openExternalUrl';

export function applyExternalLinkHandling(
  win: BrowserWindow,
  opts: {
    allowedHttpOrigins?: string[];
    beforeOpenExternal?: () => void;
  } = {},
) {
  const allowedHttpOrigins = opts.allowedHttpOrigins ?? [];

  const openInDefaultBrowserIfNeeded = (url: string): boolean => {
    if (!shouldOpenUrlExternally({ url, allowedHttpOrigins })) return false;
    try {
      opts.beforeOpenExternal?.();
    } catch {
      // best-effort only
    }
    void openExternalUrl(url).catch(() => undefined);
    return true;
  };

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (openInDefaultBrowserIfNeeded(url)) return { action: 'deny' };
    return { action: 'allow' };
  });

  win.webContents.on('will-navigate', (event, url) => {
    if (openInDefaultBrowserIfNeeded(url)) {
      event.preventDefault();
    }
  });
}
