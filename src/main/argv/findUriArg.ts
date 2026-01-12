/**
 * Requirements addressed:
 * - When launched by Windows for a protocol, detect the URI argument reliably.
 * - Avoid mis-detecting Windows filesystem paths (e.g. "C:\...") as URIs.
 * - Keep parsing logic pure/testable (no Electron side effects).
 */
const URI_SCHEME_RE = /^[a-zA-Z][a-zA-Z0-9+.-]*$/;

function looksLikeWindowsPath(arg: string): boolean {
  // Absolute drive path: C:\... or C:/...
  if (/^[a-zA-Z]:[\\/]/.test(arg)) return true;
  // UNC path: \\server\share\...
  if (arg.startsWith('\\\\')) return true;
  return false;
}

export function findUriArg(argv: string[]): string | null {
  for (const arg of argv) {
    if (!arg) continue;
    if (arg.startsWith('--')) continue;
    if (looksLikeWindowsPath(arg)) continue;

    const idx = arg.indexOf(':');
    if (idx <= 0) continue;

    const scheme = arg.slice(0, idx);
    // Ignore anything that doesn't look like an RFC3986-ish scheme.
    if (!URI_SCHEME_RE.test(scheme)) continue;

    return arg;
  }
  return null;
}
