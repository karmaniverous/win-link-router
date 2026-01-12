import { describe, expect, it } from 'vitest';

import type { RouteUriResult } from '../../core/routing/routeUri';
import {
  formatRouteFailureBanner,
  inferSchemeForRouteFailure,
} from './routeFailureUi';

describe('routeFailureUi', () => {
  it('infers scheme from RouteUriResult.scheme when available', () => {
    const result: RouteUriResult = {
      type: 'schemeNotConfigured',
      scheme: 'tel',
      uri: 'tel:+15551234567',
    };
    expect(inferSchemeForRouteFailure({ uri: result.uri, result })).toBe('TEL');
  });

  it('falls back to parsing scheme from uri', () => {
    const result: RouteUriResult = {
      type: 'noScheme',
      uri: 'not-a-uri',
    };
    expect(
      inferSchemeForRouteFailure({ uri: 'mailto:test@example.com', result }),
    ).toBe('MAILTO');
  });

  it('formats an actionable banner message', () => {
    const result: RouteUriResult = {
      type: 'noEnabledTemplates',
      scheme: 'TEL',
      uri: 'tel:+15551234567',
      matchGroups: { number: '+15551234567' },
    };
    expect(formatRouteFailureBanner(result)).toBe(
      'Routing failed: no enabled templates for TEL.',
    );
  });
});
