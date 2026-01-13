import { describe, expect, it } from 'vitest';

import { formatSchemeStatusLabel } from './formatSchemeStatusLabel';

describe('formatSchemeStatusLabel', () => {
  it('returns just the scheme name (status is icon-only)', () => {
    expect(
      formatSchemeStatusLabel({
        scheme: 'TEL',
        enabled: true,
        status: { defaultStatus: 'default', registered: true },
      }),
    ).toBe('TEL');
  });

  it('does not embed disabled/default/registration text', () => {
    expect(
      formatSchemeStatusLabel({
        scheme: 'MAILTO',
        enabled: false,
        status: null,
      }),
    ).toBe('MAILTO');
  });
});
