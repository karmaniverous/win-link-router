/**
 * Requirements addressed:
 * - Packaged app must be launchable from Start Menu even when Squirrel's
 *   Update.exe shortcut target is missing/broken.
 * - Keep side effects in main-process adapters (fs + shell.writeShortcutLink).
 */
import fs from 'node:fs/promises';
import path from 'node:path';

import { app, shell } from 'electron';

import { fileExists } from '../config/jsonFile';
import {
  buildStartMenuShortcutTarget,
  computeUpdateExePathFromExePath,
  getStartMenuProgramsDir,
  getStartMenuShortcutPath,
} from './startMenuShortcutPlan';

export async function ensureStartMenuShortcut(opts: {
  shortcutName: string;
  exePath: string;
}): Promise<{ ok: boolean; warnings: string[]; shortcutPath: string }> {
  const warnings: string[] = [];

  const appDataDir = app.getPath('appData');
  const programsDir = getStartMenuProgramsDir(appDataDir);
  const shortcutPath = getStartMenuShortcutPath(programsDir, opts.shortcutName);

  const updateExePath = computeUpdateExePathFromExePath(opts.exePath);
  const updateExeExists = await fileExists(updateExePath);
  const { target, args } = buildStartMenuShortcutTarget({
    exePath: opts.exePath,
    updateExePath,
    updateExeExists,
  });

  await fs.mkdir(programsDir, { recursive: true });

  const ok = shell.writeShortcutLink(shortcutPath, {
    target,
    args,
    cwd: path.dirname(opts.exePath),
    description: opts.shortcutName,
    icon: opts.exePath,
  });

  if (!ok) {
    warnings.push(`Failed to write Start Menu shortcut: ${shortcutPath}`);
  }

  if (!updateExeExists) {
    warnings.push(
      `Update.exe not found at ${updateExePath}; Start Menu shortcut targets the versioned exe instead.`,
    );
  }

  return { ok, warnings, shortcutPath };
}
