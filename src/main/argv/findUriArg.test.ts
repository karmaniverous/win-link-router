import { describe, expect, it } from 'vitest';

import { findUriArg } from './findUriArg';

describe('findUriArg', () => {
  it('returns null when argv contains only a Windows exe path', () => {
    expect(
      findUriArg([
        'C:\\Users\\jscro\\AppData\\Local\\win-link-router\\win-link-router.exe',
      ]),
    ).toBeNull();
  });

  it('prefers a protocol URI over a Windows path with a colon', () => {
    expect(
      findUriArg([
        'C:\\Program Files\\win-link-router\\win-link-router.exe',
        'tel:+15551234567',
      ]),
    ).toBe('tel:+15551234567');
  });

  it('ignores flag-like args and returns a URI when present', () => {
    expect(findUriArg(['--foo', '--bar=baz', 'mailto:test@example.com'])).toBe(
      'mailto:test@example.com',
    );
  });

  it('ignores UNC paths', () => {
    expect(findUriArg(['\\\\server\\share\\thing', 'tel:+1'])).toBe('tel:+1');
  });
});
