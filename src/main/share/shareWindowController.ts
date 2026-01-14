/**
 * Requirements addressed:
 * - Share page is a separate window (manual + nag).
 * - Nag interstitial can be dismissed via window X (treat as Later).
 * - In nag mode, show Later / Stop Nagging Me controls.
 * - Ensure external http/https links open in the default browser and that the
 *   share interstitial closes before opening external so the browser is on top.
 * - Share window must not display an application menu bar.
 * - Only dim/disable the main window when it is visible.
 */
import path from 'node:path';

import { BrowserWindow, type WebContents } from 'electron';

import { applyExternalLinkHandling } from '../windows/applyExternalLinkHandling';

export type ShareMode = 'manual' | 'nag';

export interface ShareContext {
  mode: ShareMode;
  scheme: string;
  templateLabel: string;
}

export class ShareWindowController {
  private shareWindow: BrowserWindow | null = null;
  private context: ShareContext | null = null;
  private nagResolve: (() => void) | null = null;
  private parentToReenable: BrowserWindow | null = null;

  constructor(
    private opts: {
      getMainWindow: () => BrowserWindow | null;
      loadShareView: (win: BrowserWindow) => Promise<void>;
      getAllowedHttpOrigins: () => string[];
    },
  ) {}

  getContext(): ShareContext | null {
    return this.context;
  }

  async open(context: ShareContext): Promise<void> {
    this.context = context;

    if (this.shareWindow) {
      this.shareWindow.show();
      this.shareWindow.focus();
      return;
    }

    const parent = this.opts.getMainWindow();
    const parentVisible = Boolean(parent?.isVisible());
    const effectiveParent = parentVisible ? parent : null;

    const win = new BrowserWindow({
      width: 560,
      height: 520,
      resizable: false,
      parent: effectiveParent ?? undefined,
      modal: Boolean(effectiveParent),
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        nodeIntegration: false,
        preload: path.join(__dirname, 'preload.js'),
      },
    });

    // Ensure no per-window menu is shown (even if the app menu exists).
    win.setMenu(null);

    if (effectiveParent) {
      this.parentToReenable = effectiveParent;
      try {
        effectiveParent.setEnabled(false);
      } catch {
        // best-effort only
      }
    }

    applyExternalLinkHandling(win, {
      allowedHttpOrigins: this.opts.getAllowedHttpOrigins(),
      beforeOpenExternal: () => {
        // Close the interstitial before opening external links so the browser
        // ends up on top.
        try {
          win.close();
        } catch {
          // best-effort only
        }
      },
    });

    win.on('closed', () => {
      this.shareWindow = null;

      if (this.parentToReenable) {
        try {
          this.parentToReenable.setEnabled(true);
        } catch {
          // best-effort only
        } finally {
          this.parentToReenable = null;
        }
      }

      const resolve = this.nagResolve;
      this.nagResolve = null;
      resolve?.();
    });

    this.shareWindow = win;
    await this.opts.loadShareView(win);
    win.show();
    win.focus();
  }

  async openNag(context: ShareContext): Promise<void> {
    await this.open({ ...context, mode: 'nag' });
    await new Promise<void>((resolve) => {
      this.nagResolve = resolve;
    });
  }

  close(): void {
    if (!this.shareWindow) return;
    try {
      this.shareWindow.close();
    } catch {
      // best-effort only
    }
  }

  getWebContents(): WebContents | null {
    return this.shareWindow?.webContents ?? null;
  }
}
