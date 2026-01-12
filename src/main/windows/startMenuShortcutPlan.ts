/**
 * Requirements addressed:
 * - Packaged app should be launchable via Start Menu reliably.
 * - Squirrel installs under %LOCALAPPDATA% and commonly uses Update.exe as the
 *   Start Menu shortcut target; if Update.exe is missing/broken, fall back to
 *   launching the versioned exe directly.
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

export function getStartMenuShortcutPath(
  programsDir: string,
  shortcutName: string,
): string {
  return path.join(programsDir, `${shortcutName}.lnk`);
}

export function buildStartMenuShortcutTarget(opts: {
  exePath: string;
  updateExePath: string;
  updateExeExists: boolean;
}): { target: string; args: string } {
  if (opts.updateExeExists) {
    const exeName = path.basename(opts.exePath);
    return {
      target: opts.updateExePath,
      args: `--processStart ${exeName}`,
    };
  }

  return { target: opts.exePath, args: '' };
}

export function computeUpdateExePathFromExePath(exePath: string): string {
  // Squirrel layout:
  //   <root>\Update.exe
  //   <root>\app-<ver>\win-link-router.exe
  return path.resolve(path.dirname(exePath), '..', 'Update.exe');
}
