/**
 * Requirements addressed:
 * - In routing-only mode, avoid modal prompts.
 * - If mismatches are detected and RIB is ON (tray exists), show a best-effort
 *   tray notification prompting the user to open the UI / Default Apps.
 */
import type { Tray } from 'electron';

import type { AppConfig } from '../../core/config/appConfig';
import {
  computeDefaultHandlerMismatch,
  formatDefaultHandlerMismatchForTray,
} from '../../core/windows/defaultHandlerMismatch';
import { getAllSchemeStatusesFromConfig } from './protocolRegistration';

export async function maybeNotifyDefaultHandlerMismatch(opts: {
  config: AppConfig;
  exePath?: string;
  tray: Tray | null;
  platform?: NodeJS.Platform;
}): Promise<{ notified: boolean }> {
  const platform = opts.platform ?? process.platform;
  if (platform !== 'win32') return { notified: false };
  if (!opts.tray) return { notified: false };
  if (typeof opts.tray.displayBalloon !== 'function')
    return { notified: false };

  const statuses = await getAllSchemeStatusesFromConfig(opts.config, {
    exePath: opts.exePath,
  });

  const mismatch = computeDefaultHandlerMismatch(statuses);
  if (!mismatch) return { notified: false };

  opts.tray.displayBalloon({
    title: 'Default app not set for some protocols',
    content: [
      'win-link-router is not the default handler for some enabled protocols.',
      '',
      formatDefaultHandlerMismatchForTray(mismatch),
      '',
      'Open win-link-router (or Windows Default Apps) to fix.',
    ].join('\n'),
  });

  return { notified: true };
}
