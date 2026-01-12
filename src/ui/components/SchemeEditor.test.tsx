import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { SchemeConfig, TemplateConfig } from '../../core/config/appConfig';
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

  it('calls onChangeScheme when template enabled flag is toggled', () => {
    const scheme = createScheme();
    const onChangeScheme = vi.fn();

    // We use act + client rendering to simulate a change event.
    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      const { createRoot } =
        require('react-dom/client') as typeof import('react-dom/client');
      const root = createRoot(container);
      root.render(
        <SchemeEditor
          api={createDummyApi()}
          presets={null}
          readOnly={false}
          scheme={scheme}
          onChangeScheme={onChangeScheme}
          onRemoveScheme={vi.fn()}
        />,
      );
    });

    const checkboxes = container.querySelectorAll('input[type="checkbox"]');
    // The first checkbox is the scheme.enabled, the second is template.enabled.
    const templateCheckbox = checkboxes[1] as HTMLInputElement | undefined;
    expect(templateCheckbox).toBeDefined();

    act(() => {
      templateCheckbox!.click();
    });

    expect(onChangeScheme).toHaveBeenCalledTimes(1);
    const nextScheme = onChangeScheme.mock.calls[0]?.[0] as SchemeConfig;
    const updatedTemplate: TemplateConfig | undefined =
      nextScheme.templates.find((t) => t.id === 't1');
    expect(updatedTemplate?.enabled).toBe(false);
  });
});
