import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
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
      pickSharedConfigPath: vi.fn(),
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
      evaluate: impl,
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

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  const base: AppConfig = {
    schemaVersion: 1,
    appVersion: '0.0.0',
    settings: {
      runAtLogin: false,
      sharedConfigPath: null,
    },
    schemes: [],
  };
  return { ...base, ...overrides };
}

describe('TestPanel', () => {
  it('renders placeholder when URI is empty', () => {
    const api = createApiWithEvaluate(
      vi.fn().mockResolvedValue({ evaluations: [] }),
    );

    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <TestPanel
          api={api}
          config={createConfig()}
          testUri=""
          onChangeTestUri={() => undefined}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('Enter a URI to run tests.');
  });

  it('renders basic structure when a URI is provided', () => {
    const api = createApiWithEvaluate(
      vi.fn().mockResolvedValue({ evaluations: [] }),
    );

    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <TestPanel
          api={api}
          config={createConfig()}
          testUri="tel:+1 555 123 4567"
          onChangeTestUri={() => undefined}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('Incoming URI');
    expect(html).toContain('Scheme:');
  });
});
