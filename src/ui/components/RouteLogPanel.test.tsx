import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { RouteLogPanel } from './RouteLogPanel';

function createDummyApi(): WinLinkRouterApi {
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
  };
}

describe('RouteLogPanel', () => {
  it('renders panel shell', () => {
    const html = renderToStaticMarkup(<RouteLogPanel api={createDummyApi()} />);
    expect(html).toContain('Routing log');
  });
});
