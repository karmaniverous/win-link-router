/**
 * Requirements addressed:
 * - Provide a shortcut to open Windows Default Apps settings so the user can
 *   assign this app as default for protocols.
 */
import { shell } from 'electron';

export async function openWindowsDefaultApps(): Promise<void> {
  // Best-effort generic entry point. We can add scheme-specific deep links later
  // if Windows supports them reliably.
  await shell.openExternal('ms-settings:defaultapps');
}
