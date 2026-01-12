import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { SchemeConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { SchemeEditor } from './SchemeEditor';

function createDummyApi(): WinLinkRouterApi {
  // Only the windows methods are used directly by SchemeEditor in tests.
  return {
    appConfig: {
      get: vi.fn(),
      set: vi.fn(),
      exportSchemes: vi.fn(),
      importSchemes: vi.fn(),
    },
    settings: {
      set: vi.fn(),
    },
    presets: {
      get: vi.fn(),
    },
    windows: {
      ensureRegistration: vi.fn(),
      getSchemeStatuses: vi.fn(),
      openDefaultApps: vi.fn().mockResolvedValue({ ok: true }),
    },
    routing: {
      getLastRouteError: vi.fn(),
      clearLastRouteError: vi.fn(),
    },
    routeLog: {
      get: vi.fn().mockResolvedValue({ entries: [] }),
      clear: vi.fn().mockResolvedValue({ ok: true as const }),
    },
    test: {
      evaluate: vi.fn(),
    },
  };
}

function createScheme(overrides: Partial<SchemeConfig> = {}): SchemeConfig {
  const base: SchemeConfig = {
    scheme: 'TEL',
    enabled: true,
    extractor: { pattern: '^tel:(?<number>.*)$', flags: 'i' },
    templates: [
      {
        id: 't1',
        label: 'WhatsApp Desktop',
        template: 'whatsapp://send?phone={{digits number}}',
        enabled: true,
      },
    ],
  };
  return { ...base, ...overrides };
}

describe('SchemeEditor', () => {
  it('renders placeholder message when no scheme is selected', () => {
    const html = renderToStaticMarkup(
      <SchemeEditor
        api={createDummyApi()}
        presets={null}
        readOnly={false}
        scheme={null}
        onChangeScheme={vi.fn()}
        onRemoveScheme={vi.fn()}
      />,
    );

    expect(html).toContain('Select a scheme to edit.');
  });

  it('renders basic controls for a selected scheme', () => {
    const scheme = createScheme();

    const html = renderToStaticMarkup(
      <SchemeEditor
        api={createDummyApi()}
        presets={null}
        readOnly={false}
        scheme={scheme}
        onChangeScheme={vi.fn()}
        onRemoveScheme={vi.fn()}
      />,
    );

    expect(html).toContain('<h2>TEL</h2>');
    expect(html).toContain('Extractor');
    expect(html).toContain('Templates');
    expect(html).toContain('WhatsApp Desktop');
  });

  it('renders enabled checkbox for templates', () => {
    const scheme = createScheme();
    const html = renderToStaticMarkup(
      <SchemeEditor
        api={createDummyApi()}
        presets={null}
        readOnly={false}
        scheme={scheme}
        onChangeScheme={vi.fn()}
        onRemoveScheme={vi.fn()}
      />,
    );

    // Expect at least one checkbox for scheme.enabled and one for template.enabled.
    const checkboxCount = (html.match(/type="checkbox"/g) ?? []).length;
    expect(checkboxCount).toBeGreaterThanOrEqual(2);
  });
});
