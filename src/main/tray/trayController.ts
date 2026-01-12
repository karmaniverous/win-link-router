/**
 * Requirements addressed:
 * - Support background operation via tray.
 * - Closing the window hides to tray; Quit is explicit.
 *
 * Notes:
 * - We avoid adding binary icon assets by using app.getFileIcon(process.execPath).
 */
import path from 'node:path';

import { app, Menu, nativeImage, shell, Tray } from 'electron';

import { ensureStartMenuShortcut } from '../windows/ensureStartMenuShortcut';
import {
  getStartMenuProgramsDir,
  getStartMenuShortcutPath,
} from '../windows/startMenuShortcutPlan';

interface TrayController {
  tray: Tray;
  destroy(): void;
}

export async function createTrayController(opts: {
  onToggleMainWindow: () => void;
  onQuit: () => void;
}): Promise<TrayController | null> {
  let icon;
  try {
    icon = await app.getFileIcon(process.execPath);
  } catch {
    icon = nativeImage.createEmpty();
  }

  try {
    const tray = new Tray(icon);
    tray.setToolTip('win-link-router');

    const menu = Menu.buildFromTemplate([
      {
        label: 'Show/Hide',
        click: () => {
          opts.onToggleMainWindow();
        },
      },
      { type: 'separator' },
      {
        label: 'Show Start Menu shortcut',
        click: () => {
          const programsDir = getStartMenuProgramsDir(app.getPath('appData'));
          const shortcutPath = getStartMenuShortcutPath(
            programsDir,
            'win-link-router',
          );
          shell.showItemInFolder(shortcutPath);
        },
      },
      {
        label: 'Repair Start Menu shortcut',
        click: () => {
          void ensureStartMenuShortcut({
            shortcutName: 'win-link-router',
            exePath: process.execPath,
          }).catch(() => undefined);
        },
      },
      {
        label: 'Show install location',
        click: () => {
          shell.showItemInFolder(process.execPath);
        },
      },
      {
        label: 'Open data folder',
        click: () => {
          void shell.openPath(app.getPath('userData'));
        },
      },
      { type: 'separator' },
      {
        label: 'Quit',
        click: () => {
          opts.onQuit();
        },
      },
    ]);
    tray.setContextMenu(menu);

    tray.on('click', () => {
      opts.onToggleMainWindow();
    });

    return {
      tray,
      destroy() {
        tray.destroy();
      },
    };
  } catch {
    return null;
  }
}
