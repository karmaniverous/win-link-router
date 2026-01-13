/**
 * Requirements addressed:
 * - http/https links must open in the system default browser (not inside the app).
 * - Keep policy logic pure/testable (no Electron side effects).
 */
function parseUrl(value: string): URL | null {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

export function shouldOpenUrlExternally(opts: {
  url: string;
  allowedHttpOrigins?: string[];
}): boolean {
  const parsed = parseUrl(opts.url);
  if (!parsed) return false;

  const protocol = parsed.protocol;
  if (protocol !== 'http:' && protocol !== 'https:') return false;

  const allowed = new Set((opts.allowedHttpOrigins ?? []).filter(Boolean));
  if (allowed.has(parsed.origin)) return false;

  return true;
}
