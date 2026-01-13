import { describe, expect, it } from 'vitest';

import { getExtractorError } from './getExtractorError';

describe('getExtractorError', () => {
  it('rejects global regex flag g', () => {
    expect(getExtractorError({ pattern: '^x$', flags: 'ig' })).toBe(
      'Extractor flags must not include "g".',
    );
  });

  it('rejects invalid regex patterns', () => {
    const msg = getExtractorError({ pattern: '(', flags: '' });
    expect(msg).toMatch(/Extractor regex is invalid/);
  });

  it('returns null for a valid regex', () => {
    expect(getExtractorError({ pattern: '^tel:(?<n>.*)$', flags: 'i' })).toBe(
      null,
    );
  });
});
