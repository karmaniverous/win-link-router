import { describe, expect, it } from 'vitest';

import { formatSchemeStatusLabel } from './formatSchemeStatusLabel';

describe('formatSchemeStatusLabel', () => {
  it('formats default/registered status', () => {
    expect(
      formatSchemeStatusLabel({
        scheme: 'TEL',
        enabled: true,
        status: { defaultStatus: 'default', registered: true },
      }),
    ).toBe('TEL — Default, Registered');
  });

  it('includes disabled + unknowns when missing status', () => {
    expect(
      formatSchemeStatusLabel({
        scheme: 'MAILTO',
        enabled: false,
        status: null,
      }),
    ).toBe('MAILTO — disabled, Default unknown, Registration unknown');
  });
});
