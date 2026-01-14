/**
 * Requirements addressed:
 * - Detect Windows default-handler status robustly.
 * - If Windows reports an opaque AppX* ProgId, avoid guessing; only treat it as
 *   "default" when we can positively recognize our app via registry metadata.
 * - Keep the interpretation logic pure/testable (no registry IO).
 */
import path from 'node:path';

function normalizeToken(value: string): string {
  return value.trim().toLowerCase();
}

function uniqNonEmpty(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const n = normalizeToken(v);
    if (!n) continue;
    if (seen.has(n)) continue;
    seen.add(n);
    out.push(n);
  }
  return out;
}

export function buildAppxProgIdHints(opts: {
  exePath?: string;
  appDisplayName?: string;
  vendorHint?: string;
}): string[] {
  const exeName = opts.exePath ? path.basename(opts.exePath) : '';
  return uniqNonEmpty([
    opts.appDisplayName ?? '',
    opts.vendorHint ?? '',
    exeName,
  ]);
}

function collectValueStrings(values: Record<string, string>): string[] {
  return Object.values(values)
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.toLowerCase());
}

export function isLikelyAppxProgIdForThisApp(opts: {
  progId: string;
  values: Record<string, string>;
  hints: string[];
}): boolean {
  const progIdLower = opts.progId.toLowerCase();
  if (!progIdLower.startsWith('appx')) return false;

  const hints = uniqNonEmpty(opts.hints);
  if (hints.length === 0) return false;

  const haystacks = [progIdLower, ...collectValueStrings(opts.values)];

  for (const h of hints) {
    // Substring match is intentional: AppX metadata commonly includes resource
    // strings or AUMIDs where our identity appears as a segment.
    if (haystacks.some((x) => x.includes(h))) return true;
  }

  return false;
}
