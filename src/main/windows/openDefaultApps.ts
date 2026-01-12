/**
 * Requirements addressed:
 * - Provide a shortcut to open Windows Default Apps settings so the user can
 *   assign this app as default for protocols.
 * - When invoked for a specific scheme, provide lightweight guidance without
 *   attempting to programmatically set defaults.
 */
import { clipboard, dialog, shell } from 'electron';

import { buildDefaultAppsSettingsUri } from './defaultAppsDeepLink';

const REGISTERED_APP_USER = 'win-link-router';

function normalizeSchemeForUi(raw: string): string {
  const trimmed = raw.trim();
  const withoutColon = trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed;
  return withoutColon.toLowerCase();
}

async function openDefaultAppsSettingsForThisApp(): Promise<void> {
  const deepLink = buildDefaultAppsSettingsUri({
    registeredAppUser: REGISTERED_APP_USER,
  });

  try {
    await shell.openExternal(deepLink);
    return;
  } catch {
    // Fall back for older Windows builds that don't support the query param.
  }

  await shell.openExternal('ms-settings:defaultapps');
}

export async function openWindowsDefaultApps(opts?: {
  scheme?: string;
}): Promise<void> {
  const scheme = opts?.scheme ? normalizeSchemeForUi(opts.scheme) : null;

  if (scheme) {
    try {
      clipboard.writeText(scheme);
    } catch {
      // Best-effort only.
    }

    const res = await dialog.showMessageBox({
      type: 'info',
      title: 'Set default app',
      message: `Set win-link-router as the default handler for "${scheme}:"`,
      detail: [
        'Windows Settings will open to Default apps.',
        '',
        'Tip: choose “Choose defaults by link type” and search for the protocol.',
        `The protocol name "${scheme}" was copied to your clipboard.`,
      ].join('\n'),
      buttons: ['Open Default Apps', 'Cancel'],
      defaultId: 0,
      cancelId: 1,
      noLink: true,
    });

    if (res.response !== 0) return;
  }

  await openDefaultAppsSettingsForThisApp();
}
