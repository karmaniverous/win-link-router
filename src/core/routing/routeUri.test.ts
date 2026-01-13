/**
 * Requirements addressed:
 * - Render failures stop routing (open UI; no fallback to the next template).
 * - openExternal failures try the next enabled template (best-effort fallback).
 * - Template context supports top-level groups and match.groups.*
 * - The context does not provide a `groups` convenience object.
 */
import { describe, expect, it, vi } from 'vitest';

import type { OpenExternalPort } from './routeUri';
import { routeUriWithSchemeConfig } from './routeUri';
import { createTemplateRenderer } from './templateRenderer';

describe('routeUriWithSchemeConfig', () => {
  it('tries the next template when openExternal throws', async () => {
    const renderer = createTemplateRenderer();
    const openExternal = vi
      .fn()
      .mockRejectedValueOnce(new Error('no handler'))
      .mockResolvedValueOnce(undefined);

    const schemeConfig = {
      scheme: 'TEL',
      enabled: true,
      registered: true,
      extractor: { pattern: '^tel:(?<number>.*)$', flags: 'i' },
      templates: [
        {
          id: 't1',
          label: 'WhatsApp Desktop',
          template: 'whatsapp://send?phone={{digits number}}',
          enabled: true,
        },
        {
          id: 't2',
          label: 'WhatsApp Web',
          template: 'https://wa.me/{{digits number}}',
          enabled: true,
        },
      ],
    };

    const result = await routeUriWithSchemeConfig(
      renderer,
      { openExternal: openExternal as OpenExternalPort['openExternal'] },
      'tel:1 (773) 750-0338',
      schemeConfig,
    );

    expect(result.type).toBe('routed');
    if (result.type !== 'routed') return;

    expect(result.target).toBe('https://wa.me/17737500338');
    expect(openExternal).toHaveBeenCalledTimes(2);
    expect(openExternal.mock.calls[0]?.[0]).toBe(
      'whatsapp://send?phone=17737500338',
    );
    expect(openExternal.mock.calls[1]?.[0]).toBe('https://wa.me/17737500338');
  });

  it('stops routing on template render error (no fallback)', async () => {
    const renderer = createTemplateRenderer();
    const openExternal = vi.fn().mockResolvedValue(undefined);

    const schemeConfig = {
      scheme: 'TEL',
      enabled: true,
      registered: true,
      extractor: { pattern: '^(?<num>[\\d\\s]+)$' },
      templates: [
        {
          id: 't1',
          label: 'Broken',
          template: 'whatsapp://send?phone={{digits number}}',
          enabled: true,
        },
        {
          id: 't2',
          label: 'Would work but must not be tried',
          template: 'https://wa.me/{{digits num}}',
          enabled: true,
        },
      ],
    };

    const result = await routeUriWithSchemeConfig(
      renderer,
      { openExternal: openExternal as OpenExternalPort['openExternal'] },
      '17737500338',
      schemeConfig,
    );

    expect(result.type).toBe('templateRenderError');
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('treats groups.* as unsupported (groups is not provided)', async () => {
    const renderer = createTemplateRenderer();
    const openExternal = vi.fn().mockResolvedValue(undefined);

    const schemeConfig = {
      scheme: 'TEL',
      enabled: true,
      registered: true,
      extractor: { pattern: '^(?<number>[\\d\\s]+)$' },
      templates: [
        {
          id: 't1',
          label: 'Unsupported access path',
          template: 'whatsapp://send?phone={{digits groups.number}}',
          enabled: true,
        },
      ],
    };

    const result = await routeUriWithSchemeConfig(
      renderer,
      { openExternal: openExternal as OpenExternalPort['openExternal'] },
      '17737500338',
      schemeConfig,
    );

    expect(result.type).toBe('templateRenderError');
    expect(openExternal).not.toHaveBeenCalled();
  });

  it('allows advanced templates to use match.groups.*', async () => {
    const renderer = createTemplateRenderer();
    const openExternal = vi.fn().mockResolvedValue(undefined);

    const schemeConfig = {
      scheme: 'TEL',
      enabled: true,
      registered: true,
      extractor: { pattern: '^tel:(?<number>.*)$', flags: 'i' },
      templates: [
        {
          id: 't1',
          label: 'Advanced',
          template: 'whatsapp://send?phone={{digits match.groups.number}}',
          enabled: true,
        },
      ],
    };

    const result = await routeUriWithSchemeConfig(
      renderer,
      { openExternal: openExternal as OpenExternalPort['openExternal'] },
      'tel:1 (773) 750-0338',
      schemeConfig,
    );

    expect(result.type).toBe('routed');
    expect(openExternal).toHaveBeenCalledWith(
      'whatsapp://send?phone=17737500338',
    );
  });
});
