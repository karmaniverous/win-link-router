/**
 * Requirements addressed:
 * - Packaged app should be launchable via Start Menu reliably.
 * - Squirrel installs under %LOCALAPPDATA% and Start Menu items are per-user.
 * - Prefer launching the installed app exe directly (most reliable baseline).
 * - Keep path/arg selection pure/testable.
 */
import path from 'node:path';

export function getStartMenuProgramsDir(appDataDir: string): string {
  return path.join(
    appDataDir,
    'Microsoft',
    'Windows',
    'Start Menu',
    'Programs',
  );
}

export function getStartMenuAppDir(
  programsDir: string,
  appFolderName: string,
): string {
  return path.join(programsDir, appFolderName);
}

export function getStartMenuShortcutPath(
  directory: string,
  shortcutName: string,
): string {
  return path.join(directory, `${shortcutName}.lnk`);
}

export function buildStartMenuShortcutTarget(opts: { exePath: string }): {
  target: string;
  args: string;
} {
  void opts;
  return { target: opts.exePath, args: '' };
}

export function computeUpdateExePathFromExePath(exePath: string): string {
  // Squirrel layout:
  //   <root>\Update.exe
  //   <root>\app-<ver>\win-link-router.exe
  return path.resolve(path.dirname(exePath), '..', 'Update.exe');
}
