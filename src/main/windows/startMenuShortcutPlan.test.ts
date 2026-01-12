import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  buildStartMenuShortcutTarget,
  computeUpdateExePathFromExePath,
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

  it('uses Update.exe when present', () => {
    expect(
      buildStartMenuShortcutTarget({
        exePath: 'C:\\x\\app-0.0.0\\win-link-router.exe',
        updateExePath: 'C:\\x\\Update.exe',
        updateExeExists: true,
      }),
    ).toEqual({
      target: 'C:\\x\\Update.exe',
      args: '--processStart win-link-router.exe',
    });
  });

  it('falls back to exe when Update.exe is missing', () => {
    expect(
      buildStartMenuShortcutTarget({
        exePath: 'C:\\x\\app-0.0.0\\win-link-router.exe',
        updateExePath: 'C:\\x\\Update.exe',
        updateExeExists: false,
      }),
    ).toEqual({ target: 'C:\\x\\app-0.0.0\\win-link-router.exe', args: '' });
  });

  it('computes Update.exe path from exePath', () => {
    expect(
      computeUpdateExePathFromExePath('C:\\x\\app-0.0.0\\win-link-router.exe'),
    ).toBe(path.resolve('C:\\x\\Update.exe'));
  });
});
