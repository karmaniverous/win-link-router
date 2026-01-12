/**
 * Requirements addressed:
 * - Provide a shortcut to open Windows Default Apps settings so the user can
 *   assign this app as default for protocols.
 * - Prefer best-effort deep links where supported, with safe fallbacks.
 *
 * Notes:
 * - Windows 11 supports query params such as `registeredAppUser` and
 *   `registeredAUMID` for `ms-settings:defaultapps`. This helper only builds
 *   the URI; the caller is responsible for fallbacks if the OS doesn't support it.
 */
export function buildDefaultAppsSettingsUri(opts?: {
  registeredAppUser?: string;
  registeredAppMachine?: string;
  registeredAUMID?: string;
}): string {
  const registeredAppUser = opts?.registeredAppUser ?? null;
  const registeredAppMachine = opts?.registeredAppMachine ?? null;
  const registeredAUMID = opts?.registeredAUMID ?? null;

  const provided = [
    registeredAppUser,
    registeredAppMachine,
    registeredAUMID,
  ].filter((v) => v !== null).length;

  if (provided > 1) {
    throw new Error(
      'Only one Default Apps deep link parameter may be specified.',
    );
  }

  if (registeredAppUser) {
    return `ms-settings:defaultapps?registeredAppUser=${encodeURIComponent(
      registeredAppUser,
    )}`;
  }

  if (registeredAppMachine) {
    return `ms-settings:defaultapps?registeredAppMachine=${encodeURIComponent(
      registeredAppMachine,
    )}`;
  }

  if (registeredAUMID) {
    return `ms-settings:defaultapps?registeredAUMID=${encodeURIComponent(
      registeredAUMID,
    )}`;
  }

  return 'ms-settings:defaultapps';
}
