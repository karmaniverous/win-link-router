import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { SchemeConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
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
      pickSharedConfigPath: vi.fn(),
    },
    presets: {
      get: vi.fn(),
    },
    windows: {
      ensureRegistration: vi.fn(),
      getSchemeStatuses: vi.fn(),
      openDefaultApps: vi.fn().mockResolvedValue({ ok: true }),
      openExternal: vi.fn().mockResolvedValue({ ok: true }),
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
    updates: {
      getStatus: vi.fn(),
      checkNow: vi.fn(),
      updateNow: vi.fn(),
    },
    share: {
      open: vi.fn(),
      getContext: vi.fn(),
      later: vi.fn(),
      stopNagging: vi.fn(),
      shareX: vi.fn(),
      shareLinkedIn: vi.fn(),
    },
  };
}

function createScheme(overrides: Partial<SchemeConfig> = {}): SchemeConfig {
  const base: SchemeConfig = {
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
    ],
  };
  return { ...base, ...overrides };
}

describe('SchemeEditor', () => {
  it('renders placeholder message when no scheme is selected', () => {
    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <SchemeEditor
          api={createDummyApi()}
          presets={null}
          readOnly={false}
          scheme={null}
          onChangeScheme={vi.fn()}
          onRemoveScheme={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('Select a scheme to edit.');
  });

  it('renders basic controls for a selected scheme', () => {
    const scheme = createScheme();

    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <SchemeEditor
          api={createDummyApi()}
          presets={null}
          readOnly={false}
          scheme={scheme}
          onChangeScheme={vi.fn()}
          onRemoveScheme={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('TEL');
    expect(html).toContain('Extractor');
    expect(html).toContain('Templates');
    expect(html).toContain('WhatsApp Desktop');
  });

  it('renders power controls for templates', () => {
    const scheme = createScheme();
    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <SchemeEditor
          api={createDummyApi()}
          presets={null}
          readOnly={false}
          scheme={scheme}
          onChangeScheme={vi.fn()}
          onRemoveScheme={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('aria-label="Toggle template enabled"');
  });

  it('shows an inline error when extractor regex is invalid', () => {
    const scheme = createScheme({
      extractor: { pattern: '(', flags: '' },
    });

    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <SchemeEditor
          api={createDummyApi()}
          presets={null}
          readOnly={false}
          scheme={scheme}
          onChangeScheme={vi.fn()}
          onRemoveScheme={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('Extractor regex is invalid:');
  });
});
