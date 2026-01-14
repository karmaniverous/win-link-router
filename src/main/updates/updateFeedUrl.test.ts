import { describe, expect, it } from 'vitest';

import { buildUpdateElectronjsOrgFeedUrl } from './updateFeedUrl';

describe('buildUpdateElectronjsOrgFeedUrl', () => {
  it('builds the expected update.electronjs.org URL', () => {
    expect(
      buildUpdateElectronjsOrgFeedUrl({
        repo: 'karmaniverous/win-link-router',
        platform: 'win32',
        arch: 'x64',
        currentVersion: '1.2.3',
      }),
    ).toBe(
      'https://update.electronjs.org/karmaniverous/win-link-router/win32-x64/1.2.3',
    );
  });

  it('URI-encodes the version segment', () => {
    expect(
      buildUpdateElectronjsOrgFeedUrl({
        repo: 'a/b',
        platform: 'win32',
        arch: 'x64',
        currentVersion: '1.2.3+meta',
      }),
    ).toBe('https://update.electronjs.org/a/b/win32-x64/1.2.3%2Bmeta');
  });
});
