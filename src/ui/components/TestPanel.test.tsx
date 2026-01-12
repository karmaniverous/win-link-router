import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { TestPanel } from './TestPanel';

function createApiWithEvaluate(
  impl: WinLinkRouterApi['test']['evaluate'],
): WinLinkRouterApi {
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
      openDefaultApps: vi.fn(),
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
      evaluate: impl,
    },
  };
}

describe('TestPanel', () => {
  it('renders placeholder when no scheme is selected', () => {
    const api = createApiWithEvaluate(
      vi.fn().mockResolvedValue({ evaluations: [] }),
    );

    const html = renderToStaticMarkup(
      <TestPanel
        api={api}
        scheme={null}
        testUri=""
        onChangeTestUri={() => undefined}
      />,
    );

    expect(html).toContain('Select a scheme to run tests.');
  });

  it('renders basic structure when a scheme and URI are provided', () => {
    const api = createApiWithEvaluate(
      vi.fn().mockResolvedValue({ evaluations: [] }),
    );

    const html = renderToStaticMarkup(
      <TestPanel
        api={api}
        scheme="TEL"
        testUri="tel:+1 555 123 4567"
        onChangeTestUri={() => undefined}
      />,
    );

    expect(html).toContain('Incoming URI');
    expect(html).toContain('Test');
  });
});
