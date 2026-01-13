import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
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

function createConfig(): AppConfig {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    settings: {
      runAtLogin: false,
      sharedConfigPath: null,
      routeLogMode: 'redacted',
    },
    schemes: [],
  };
}

describe('RouteLogPanel', () => {
  it('renders panel shell', () => {
    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <RouteLogPanel api={createDummyApi()} config={createConfig()} />
      </MantineTestProvider>,
    );
    expect(html).toContain('Routing log');
  });
});
