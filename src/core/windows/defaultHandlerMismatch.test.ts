import { describe, expect, it } from 'vitest';

import {
  computeDefaultHandlerMismatch,
  formatDefaultHandlerMismatchForTray,
  type SchemeStatusLike,
} from './defaultHandlerMismatch';

describe('computeDefaultHandlerMismatch', () => {
  it('returns null when there is no mismatch among enabled+registered', () => {
    const statuses: SchemeStatusLike[] = [
      {
        scheme: 'TEL',
        enabled: true,
        registered: true,
        defaultStatus: 'default',
      },
      {
        scheme: 'MAILTO',
        enabled: true,
        registered: false,
        defaultStatus: 'not-default',
      },
      {
        scheme: 'CALLTO',
        enabled: false,
        registered: false,
        defaultStatus: 'unknown',
      },
    ];

    expect(computeDefaultHandlerMismatch(statuses)).toBeNull();
  });

  it('includes not-default and unknown for enabled+registered only', () => {
    const statuses: SchemeStatusLike[] = [
      {
        scheme: 'tel',
        enabled: true,
        registered: true,
        defaultStatus: 'not-default',
      },
      {
        scheme: 'MAILTO',
        enabled: true,
        registered: true,
        defaultStatus: 'unknown',
      },
      {
        scheme: 'HTTP',
        enabled: true,
        registered: false,
        defaultStatus: 'not-default',
      },
    ];

    expect(computeDefaultHandlerMismatch(statuses)).toEqual({
      notDefault: ['TEL'],
      unknown: ['MAILTO'],
    });
  });
});

describe('formatDefaultHandlerMismatchForTray', () => {
  it('formats a concise multi-line message', () => {
    expect(
      formatDefaultHandlerMismatchForTray({
        notDefault: ['TEL', 'MAILTO'],
        unknown: ['CALLTO'],
      }),
    ).toBe('Not default: TEL, MAILTO\nUnknown: CALLTO');
  });
});
