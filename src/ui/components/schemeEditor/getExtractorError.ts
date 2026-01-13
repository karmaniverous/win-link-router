/**
 * Requirements addressed:
 * - Extractor regex must compile (pattern + flags).
 * - Reject global regex flag "g" for determinism.
 */
import type { SchemeConfig } from '../../../core/config/appConfig';

export function getExtractorError(
  extractor: SchemeConfig['extractor'],
): string | null {
  const pattern = extractor.pattern;
  const flags = extractor.flags ?? '';

  if (!pattern.trim()) return 'Extractor pattern is required.';

  // Global matching is stateful across calls; we forbid it for determinism.
  if (flags.includes('g')) {
    return 'Extractor flags must not include "g".';
  }

  try {
    RegExp(pattern, flags);
    return null;
  } catch (err) {
    return `Extractor regex is invalid: ${(err as Error).message}`;
  }
}
