/**
 * Requirements addressed:
 * - Auto-updates must use update.electronjs.org for GitHub Releases.
 * - Keep URL construction pure/testable (no Electron side effects).
 */
export function buildUpdateElectronjsOrgFeedUrl(opts: {
  repo: string; // "owner/name"
  platform: NodeJS.Platform;
  arch: string;
  currentVersion: string;
}): string {
  const repo = opts.repo.trim();
  if (!repo) throw new Error('Missing repo.');

  const currentVersion = opts.currentVersion.trim();
  if (!currentVersion) throw new Error('Missing currentVersion.');

  const platform = opts.platform;
  const arch = opts.arch.trim();
  if (!arch) throw new Error('Missing arch.');

  // update.electronjs.org expects e.g.:
  //   https://update.electronjs.org/owner/repo/win32-x64/1.2.3
  const platArch = `${platform}-${arch}`;

  return `https://update.electronjs.org/${repo}/${platArch}/${encodeURIComponent(
    currentVersion,
  )}`;
}
