import { describe, expect, it } from 'vitest';

import { shouldOpenUrlExternally } from './externalLinkPolicy';

describe('shouldOpenUrlExternally', () => {
  it('returns true for https links by default', () => {
    expect(
      shouldOpenUrlExternally({ url: 'https://github.com/karmaniverous' }),
    ).toBe(true);
  });

  it('returns false for non-http(s) protocols', () => {
    expect(shouldOpenUrlExternally({ url: 'file:///x/index.html' })).toBe(
      false,
    );
    expect(shouldOpenUrlExternally({ url: 'ms-settings:defaultapps' })).toBe(
      false,
    );
  });

  it('returns false for invalid URLs', () => {
    expect(shouldOpenUrlExternally({ url: 'not-a-url' })).toBe(false);
  });

  it('allows http(s) URLs whose origin is allowlisted', () => {
    expect(
      shouldOpenUrlExternally({
        url: 'http://localhost:5173/',
        allowedHttpOrigins: ['http://localhost:5173'],
      }),
    ).toBe(false);
  });
});
