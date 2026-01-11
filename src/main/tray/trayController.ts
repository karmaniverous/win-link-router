/**
 * Requirements addressed:
 * - Support background operation via tray.
 * - Closing the window hides to tray; Quit is explicit.
 *
 * Notes:
 * - We avoid adding binary icon assets by using app.getFileIcon(process.execPath).
 */
import { app, Menu, nativeImage, Tray } from 'electron';

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
