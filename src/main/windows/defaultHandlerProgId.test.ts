import { describe, expect, it } from 'vitest';

import { computeDefaultHandlerStatus } from './defaultHandlerProgId';

describe('computeDefaultHandlerStatus', () => {
  it('returns unknown when actualProgId is null', () => {
    expect(
      computeDefaultHandlerStatus({
        expectedProgId: 'win-link-router.url.tel',
        actualProgId: null,
        exePath: 'C:\\Path\\win-link-router.exe',
      }),
    ).toBe('unknown');
  });

  it('treats matching expected ProgId as default (case-insensitive)', () => {
    expect(
      computeDefaultHandlerStatus({
        expectedProgId: 'win-link-router.url.tel',
        actualProgId: 'WIN-LINK-ROUTER.URL.TEL',
        exePath: 'C:\\Path\\win-link-router.exe',
      }),
    ).toBe('default');
  });

  it('treats Applications\\<exe>.exe ProgId as default when exe matches', () => {
    expect(
      computeDefaultHandlerStatus({
        expectedProgId: 'win-link-router.url.tel',
        actualProgId: 'Applications\\win-link-router.exe',
        exePath: 'C:\\Users\\me\\AppData\\Local\\win-link-router.exe',
      }),
    ).toBe('default');
  });

  it('returns not-default when Applications ProgId exe does not match', () => {
    expect(
      computeDefaultHandlerStatus({
        expectedProgId: 'win-link-router.url.tel',
        actualProgId: 'Applications\\other.exe',
        exePath: 'C:\\Path\\win-link-router.exe',
      }),
    ).toBe('not-default');
  });
});
