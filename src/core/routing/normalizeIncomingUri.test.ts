import { describe, expect, it } from 'vitest';

import { normalizeIncomingUri } from './normalizeIncomingUri';

describe('normalizeIncomingUri', () => {
  it('returns decodedUri identical to rawUri when no scheme is present', () => {
    expect(normalizeIncomingUri('not-a-uri')).toEqual({
      rawUri: 'not-a-uri',
      decodedUri: 'not-a-uri',
    });
  });

  it('decodes only the payload after the first ":"', () => {
    const out = normalizeIncomingUri('tel:%2B62%20816%2017');
    expect(out.rawUri).toBe('tel:%2B62%20816%2017');
    expect(out.decodedUri).toBe('tel:+62 816 17');
  });

  it('does not throw on malformed percent sequences', () => {
    const out = normalizeIncomingUri('tel:100%');
    expect(out.rawUri).toBe('tel:100%');
    expect(out.decodedUri.startsWith('tel:')).toBe(true);
  });
});
