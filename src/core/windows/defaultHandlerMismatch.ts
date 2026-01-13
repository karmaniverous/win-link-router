/**
 * Requirements addressed:
 * - Compare enabled + registered schemes vs current Windows default handler.
 * - Prefer non-blocking warnings (UI banner + tray notification), not modals.
 * - Keep mismatch computation pure/testable (no registry IO).
 */
export type DefaultStatus = 'default' | 'not-default' | 'unknown';

export interface SchemeStatusLike {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: DefaultStatus;
}

export interface DefaultHandlerMismatch {
  notDefault: string[];
  unknown: string[];
}

function canonicalScheme(scheme: string): string {
  return scheme.trim().toUpperCase();
}

export function computeDefaultHandlerMismatch(
  statuses: SchemeStatusLike[],
): DefaultHandlerMismatch | null {
  const desired = statuses.filter((s) => s.enabled && s.registered);

  const notDefault = desired
    .filter((s) => s.defaultStatus === 'not-default')
    .map((s) => canonicalScheme(s.scheme))
    .sort();

  const unknown = desired
    .filter((s) => s.defaultStatus === 'unknown')
    .map((s) => canonicalScheme(s.scheme))
    .sort();

  if (notDefault.length === 0 && unknown.length === 0) return null;

  return { notDefault, unknown };
}

export function formatDefaultHandlerMismatchForTray(
  mismatch: DefaultHandlerMismatch,
): string {
  const lines: string[] = [];
  if (mismatch.notDefault.length) {
    lines.push(`Not default: ${mismatch.notDefault.join(', ')}`);
  }
  if (mismatch.unknown.length) {
    lines.push(`Unknown: ${mismatch.unknown.join(', ')}`);
  }
  return lines.join('\n');
}
