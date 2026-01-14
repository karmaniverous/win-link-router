/**
 * Requirements addressed:
 * - About window is a separate modal window opened from Help → About.
 * - About window must not display an application menu bar.
 * - When About is open and the main window is visible, the main window is dimmed/disabled.
 */
import path from 'node:path';

import { BrowserWindow } from 'electron';

import { applyExternalLinkHandling } from '../windows/applyExternalLinkHandling';

export class AboutWindowController {
  private win: BrowserWindow | null = null;
  private parentToReenable: BrowserWindow | null = null;

  constructor(
    private opts: {
      getMainWindow: () => BrowserWindow | null;
      loadAboutView: (win: BrowserWindow) => Promise<void>;
      getAllowedHttpOrigins: () => string[];
    },
  ) {}

  async open(): Promise<void> {
    if (this.win) {
      this.win.show();
      this.win.focus();
      return;
    }

    const parent = this.opts.getMainWindow();
    const parentVisible = Boolean(parent?.isVisible());
    const effectiveParent = parentVisible ? parent : null;

    const win = new BrowserWindow({
      width: 520,
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
    });

    win.on('closed', () => {
      this.win = null;
      if (this.parentToReenable) {
        try {
          this.parentToReenable.setEnabled(true);
        } catch {
          // best-effort only
        } finally {
          this.parentToReenable = null;
        }
      }
    });

    this.win = win;
    await this.opts.loadAboutView(win);
    win.show();
    win.focus();
  }
}
