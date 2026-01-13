/**
 * Requirements addressed:
 * - UI autosave must reject invalid configs before attempting persistence.
 * - Extractor must reject global regex flag "g" (determinism).
 * - Extractor regex must compile (pattern + flags).
 * - Templates must not be empty.
 */
import type { AppConfig } from '../../core/config/appConfig';

export function validateConfigBeforeSave(config: AppConfig): string | null {
  for (const scheme of config.schemes) {
    const flags = scheme.extractor.flags ?? '';
    if (flags.includes('g')) {
      return `Cannot save: ${scheme.scheme} extractor flags must not include "g".`;
    }

    try {
      RegExp(scheme.extractor.pattern, flags);
    } catch (err) {
      return `Cannot save: ${scheme.scheme} extractor regex is invalid: ${
        (err as Error).message
      }`;
    }

    for (const tpl of scheme.templates) {
      if (!tpl.template.trim()) {
        return `Cannot save: ${scheme.scheme} template "${tpl.label}" is empty.`;
      }
    }
  }

  return null;
}
