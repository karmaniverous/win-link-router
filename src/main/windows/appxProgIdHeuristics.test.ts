import { describe, expect, it } from 'vitest';

import {
  buildAppxProgIdHints,
  isLikelyAppxProgIdForThisApp,
} from './appxProgIdHeuristics';

describe('buildAppxProgIdHints', () => {
  it('includes app name, vendor hint, and exe basename', () => {
    expect(
      buildAppxProgIdHints({
        exePath: 'C:\\x\\win-link-router.exe',
        appDisplayName: 'win-link-router',
        vendorHint: 'karmaniverous',
      }),
    ).toEqual(['win-link-router', 'karmaniverous', 'win-link-router.exe']);
  });
});

describe('isLikelyAppxProgIdForThisApp', () => {
  it('returns false for non-AppX progIds', () => {
    expect(
      isLikelyAppxProgIdForThisApp({
        progId: 'Some.ProgId',
        values: { ApplicationName: 'win-link-router' },
        hints: ['win-link-router'],
      }),
    ).toBe(false);
  });

  it('returns true when HKCR metadata contains an identity hint', () => {
    expect(
      isLikelyAppxProgIdForThisApp({
        progId: 'AppXabc123',
        values: {
          ApplicationName: 'win-link-router',
          AppUserModelID: 'karmaniverous.win-link-router',
        },
        hints: ['win-link-router'],
      }),
    ).toBe(true);
  });

  it('returns false when no hints match any metadata', () => {
    expect(
      isLikelyAppxProgIdForThisApp({
        progId: 'AppXabc123',
        values: { ApplicationName: 'Some Other App' },
        hints: ['win-link-router', 'karmaniverous'],
      }),
    ).toBe(false);
  });
});
