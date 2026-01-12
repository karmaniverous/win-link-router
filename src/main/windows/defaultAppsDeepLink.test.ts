import { describe, expect, it } from 'vitest';

import { buildDefaultAppsSettingsUri } from './defaultAppsDeepLink';

describe('buildDefaultAppsSettingsUri', () => {
  it('returns the generic Default Apps settings URI by default', () => {
    expect(buildDefaultAppsSettingsUri()).toBe('ms-settings:defaultapps');
  });

  it('supports registeredAppUser', () => {
    expect(
      buildDefaultAppsSettingsUri({ registeredAppUser: 'win-link-router' }),
    ).toBe('ms-settings:defaultapps?registeredAppUser=win-link-router');
  });

  it('URI-escapes parameter values', () => {
    expect(buildDefaultAppsSettingsUri({ registeredAUMID: 'My App/Id' })).toBe(
      'ms-settings:defaultapps?registeredAUMID=My%20App%2FId',
    );
  });

  it('rejects multiple parameters', () => {
    expect(() =>
      buildDefaultAppsSettingsUri({
        registeredAppUser: 'a',
        registeredAUMID: 'b',
      }),
    ).toThrow(/Only one Default Apps deep link parameter/);
  });
});
