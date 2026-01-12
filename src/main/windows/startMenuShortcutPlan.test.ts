import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildStartMenuShortcutTarget,
  computeUpdateExePathFromExePath,
  getStartMenuAppDir,
  getStartMenuProgramsDir,
  getStartMenuShortcutPath,
} from './startMenuShortcutPlan';

describe('startMenuShortcutPlan', () => {
  it('computes Programs dir under appData', () => {
    expect(getStartMenuProgramsDir('C:\\Users\\me\\AppData\\Roaming')).toBe(
      path.join(
        'C:\\Users\\me\\AppData\\Roaming',
        'Microsoft',
        'Windows',
        'Start Menu',
        'Programs',
      ),
    );
  });

  it('computes shortcut path', () => {
    expect(getStartMenuShortcutPath('C:\\Programs', 'win-link-router')).toBe(
      path.join('C:\\Programs', 'win-link-router.lnk'),
    );
  });

  it('computes app folder under Programs', () => {
    expect(getStartMenuAppDir('C:\\Programs', 'win-link-router')).toBe(
      path.join('C:\\Programs', 'win-link-router'),
    );
  });

  it('uses the installed exe as the Start Menu shortcut target', () => {
    expect(
      buildStartMenuShortcutTarget({
        exePath: 'C:\\x\\app-0.0.0\\win-link-router.exe',
      }),
    ).toEqual({ target: 'C:\\x\\app-0.0.0\\win-link-router.exe', args: '' });
  });

  it('computes Update.exe path from exePath', () => {
    expect(
      computeUpdateExePathFromExePath('C:\\x\\app-0.0.0\\win-link-router.exe'),
    ).toBe(path.resolve('C:\\x\\Update.exe'));
  });
});
