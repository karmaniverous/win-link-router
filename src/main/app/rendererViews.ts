/**
 * Requirements addressed:
 * - Support dev server and packaged renderer loading from a single helper.
 * - Provide separate renderer views (Share/About) selected by query param.
 */
import path from 'node:path';

import type { BrowserWindow } from 'electron';

function getDevServerOrigin(devServerUrl: string | null): string | null {
  if (!devServerUrl) return null;
  try {
    return new URL(devServerUrl).origin;
  } catch {
    return null;
  }
}

export function getAllowedHttpOrigins(devServerUrl: string | null): string[] {
  const origin = getDevServerOrigin(devServerUrl);
  return origin ? [origin] : [];
}

export function loadMainView(
  win: BrowserWindow,
  opts: {
    devServerUrl: string | null;
    baseDir: string;
    viteName: string;
  },
): void {
  if (opts.devServerUrl) {
    void win.loadURL(opts.devServerUrl);
    return;
  }
  void win.loadFile(
    path.join(opts.baseDir, `../renderer/${opts.viteName}/index.html`),
  );
}

export async function loadShareView(
  win: BrowserWindow,
  opts: {
    devServerUrl: string | null;
    baseDir: string;
    viteName: string;
  },
): Promise<void> {
  if (opts.devServerUrl) {
    await win.loadURL(`${opts.devServerUrl}?view=share`);
    return;
  }
  await win.loadFile(
    path.join(opts.baseDir, `../renderer/${opts.viteName}/index.html`),
    { query: { view: 'share' } },
  );
}

export async function loadAboutView(
  win: BrowserWindow,
  opts: {
    devServerUrl: string | null;
    baseDir: string;
    viteName: string;
  },
): Promise<void> {
  if (opts.devServerUrl) {
    await win.loadURL(`${opts.devServerUrl}?view=about`);
    return;
  }
  await win.loadFile(
    path.join(opts.baseDir, `../renderer/${opts.viteName}/index.html`),
    { query: { view: 'about' } },
  );
}
