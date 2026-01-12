/**
 * Requirements addressed:
 * - Packaged app must be launchable from Start Menu even when Squirrel's
 *   default shortcut target is missing/broken.
 * - Keep side effects in main-process adapters (fs + shell.writeShortcutLink).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { app, shell } from 'electron';

import {
  buildStartMenuShortcutTarget,
  getStartMenuAppDir,
  getStartMenuProgramsDir,
  getStartMenuShortcutPath,
} from './startMenuShortcutPlan';

export async function ensureStartMenuShortcut(opts: {
  shortcutName: string;
  exePath: string;
}): Promise<{ ok: boolean; warnings: string[]; shortcutPaths: string[] }> {
  const warnings: string[] = [];

  const appDataDir = app.getPath('appData');
  const programsDir = getStartMenuProgramsDir(appDataDir);
  const appDir = getStartMenuAppDir(programsDir, opts.shortcutName);

  const shortcutPaths = [
    // Common Squirrel location: Programs\<app>\<app>.lnk
    getStartMenuShortcutPath(appDir, opts.shortcutName),
    // Fallback location: Programs\<app>.lnk
    getStartMenuShortcutPath(programsDir, opts.shortcutName),
  ];

  const { target, args } = buildStartMenuShortcutTarget({
    exePath: opts.exePath,
  });

  await fs.mkdir(programsDir, { recursive: true });
  await fs.mkdir(appDir, { recursive: true });

  const results = shortcutPaths.map((shortcutPath) => {
    return shell.writeShortcutLink(shortcutPath, {
      target,
      args,
      cwd: path.dirname(opts.exePath),
      description: opts.shortcutName,
      icon: opts.exePath,
    });
  });

  const ok = results.every(Boolean);

  if (!ok) {
    warnings.push(
      `Failed to write one or more Start Menu shortcuts: ${shortcutPaths.join(
        ', ',
      )}`,
    );
  }

  return { ok, warnings, shortcutPaths };
}
