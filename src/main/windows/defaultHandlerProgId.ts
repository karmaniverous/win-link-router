/**
 * Requirements addressed:
 * - Detect Windows default-handler status robustly based on UserChoice ProgId.
 * - Treat Applications\<exe>.exe ProgIds as "default" when they resolve to the
 *   current packaged executable (common for classic Win32 registrations).
 * - Keep the interpretation logic pure/testable (no registry IO).
 */
import path from 'node:path';

export type DefaultHandlerStatus = 'default' | 'not-default' | 'unknown';

function parseApplicationsProgId(progId: string): string | null {
  // Common shape for classic apps:
  //   "Applications\\win-link-router.exe"
  const match = /^applications\\(.+\.exe)$/i.exec(progId.trim());
  return match?.[1] ?? null;
}

export function computeDefaultHandlerStatus(opts: {
  expectedProgId: string;
  actualProgId: string | null;
  exePath?: string;
}): DefaultHandlerStatus {
  const expectedLower = opts.expectedProgId.toLowerCase();
  const actual = opts.actualProgId;
  if (actual === null) return 'unknown';

  const actualLower = actual.toLowerCase();
  if (actualLower === expectedLower) return 'default';

  if (opts.exePath) {
    const expectedExe = path.basename(opts.exePath).toLowerCase();
    const applicationsExe = parseApplicationsProgId(actualLower);
    if (applicationsExe?.toLowerCase() === expectedExe) {
      return 'default';
    }
  }

  return 'not-default';
}
