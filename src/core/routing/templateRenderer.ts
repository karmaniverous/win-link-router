/**
 * Requirements addressed:
 * - Templates are Handlebars rendered using extracted named capture groups
 *   (spread to top-level) plus `uri` and `match` debug metadata.
 * - Rendering must detect missing data (strict mode) and fail loudly.
 * - Provide generic, target-agnostic helpers: digits/trim/lower/upper/urlEncode.
 */
import Handlebars from 'handlebars';

export interface TemplateRenderer {
  render(template: string, context: Record<string, unknown>): string;
}

function requireValue(value: unknown, name: string): string {
  if (value === null || value === undefined) {
    throw new Error(`Missing value for ${name}.`);
  }
  return String(value);
}

export function createTemplateRenderer(): TemplateRenderer {
  const hb = Handlebars.create();

  hb.registerHelper('digits', (value: unknown) => {
    const raw = requireValue(value, 'digits(value)');
    const out = raw.replace(/\D+/g, '');
    if (!out) {
      throw new Error('digits(value) produced an empty string.');
    }
    return out;
  });

  hb.registerHelper('trim', (value: unknown) => {
    const raw = requireValue(value, 'trim(value)');
    return raw.trim();
  });

  hb.registerHelper('lower', (value: unknown) => {
    const raw = requireValue(value, 'lower(value)');
    return raw.toLowerCase();
  });

  hb.registerHelper('upper', (value: unknown) => {
    const raw = requireValue(value, 'upper(value)');
    return raw.toUpperCase();
  });

  hb.registerHelper('urlEncode', (value: unknown) => {
    const raw = requireValue(value, 'urlEncode(value)');
    return encodeURIComponent(raw);
  });

  return {
    render(template: string, context: Record<string, unknown>) {
      const compiled = hb.compile(template, {
        strict: true,
        noEscape: true,
      });
      const rendered = compiled(context);
      if (!rendered) {
        throw new Error('Template rendered to an empty string.');
      }
      return rendered;
    },
  };
}
