/**
 * Requirements addressed:
 * - Define a custom Windows application menu and remove Electron boilerplate items.
 * - Help menu: About, Documentation, Report an Issue, Get Help.
 */
import { Menu } from 'electron';

import {
  APP_TITLE,
  DISCUSSIONS_URL,
  DOCS_URL,
  ISSUES_URL,
} from '../../core/app/branding';
import { openExternalUrl } from './openExternalUrl';

export function setWindowsAppMenu(opts: {
  isDev: boolean;
  onOpenAbout: () => void;
}) {
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [{ role: 'quit' }],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
      ],
    },
    {
      label: 'View',
      submenu: opts.isDev
        ? [
            { role: 'reload' },
            { role: 'forceReload' },
            { role: 'toggleDevTools' },
            { type: 'separator' },
            { role: 'resetZoom' },
            { role: 'zoomIn' },
            { role: 'zoomOut' },
            { type: 'separator' },
            { role: 'togglefullscreen' },
          ]
        : [{ role: 'togglefullscreen' }],
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'close' }],
    },
    {
      label: 'Help',
      submenu: [
        {
          label: `About ${APP_TITLE}…`,
          click: () => {
            opts.onOpenAbout();
          },
        },
        { type: 'separator' },
        {
          label: 'Documentation',
          click: () => {
            void openExternalUrl(DOCS_URL).catch(() => undefined);
          },
        },
        {
          label: 'Report an Issue',
          click: () => {
            void openExternalUrl(ISSUES_URL).catch(() => undefined);
          },
        },
        {
          label: 'Get Help',
          click: () => {
            void openExternalUrl(DISCUSSIONS_URL).catch(() => undefined);
          },
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
