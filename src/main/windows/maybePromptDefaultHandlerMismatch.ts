/**
 * Requirements addressed:
 * - On startup / when the UI is opened, warn/prompt the user when Windows is not
 *   pointing enabled + registered schemes to this app.
 * - Provide a shortcut to Windows Default Apps settings.
 */
import { dialog } from 'electron';

import type { AppConfig } from '../../core/config/appConfig';
import { openWindowsDefaultApps } from './openDefaultApps';
import { getAllSchemeStatusesFromConfig } from './protocolRegistration';

export async function maybePromptDefaultHandlerMismatch(
  config: AppConfig,
  opts?: { exePath?: string },
): Promise<void> {
  const enabledRegistered = config.schemes.filter(
    (s) => s.enabled && s.registered,
  );
  if (enabledRegistered.length === 0) return;

  const statuses = await getAllSchemeStatusesFromConfig(config, {
    exePath: opts?.exePath,
  });
  const desiredSchemes = new Set(
    enabledRegistered.map((s) => s.scheme.toUpperCase()),
  );
  const enabledStatuses = statuses.filter((s) =>
    desiredSchemes.has(s.scheme.toUpperCase()),
  );

  const notDefault = enabledStatuses.filter(
    (s) => s.defaultStatus === 'not-default',
  );
  const unknown = enabledStatuses.filter((s) => s.defaultStatus === 'unknown');

  if (notDefault.length === 0 && unknown.length === 0) return;

  const lines: string[] = [];
  if (notDefault.length) {
    lines.push(
      `Not default: ${notDefault
        .map((s) => s.scheme)
        .sort()
        .join(', ')}`,
    );
  }
  if (unknown.length) {
    lines.push(
      `Unknown: ${unknown
        .map((s) => s.scheme)
        .sort()
        .join(', ')}`,
    );
  }

  const detail = [
    'Some enabled + registered link types are not currently set to win-link-router in Windows.',
    '',
    ...lines,
    '',
    'Open Windows Default Apps to set win-link-router for these protocols.',
  ].join('\n');

  const res = await dialog.showMessageBox({
    type: 'warning',
    title: 'Default app not set for some protocols',
    message: 'win-link-router is not the default handler for some link types.',
    detail,
    buttons: ['Open Default Apps', 'OK'],
    defaultId: 0,
    cancelId: 1,
    noLink: true,
  });

  if (res.response === 0) {
    await openWindowsDefaultApps();
  }
}
