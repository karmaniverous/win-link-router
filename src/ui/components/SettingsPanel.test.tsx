import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { SettingsPanel } from './SettingsPanel';

function createDummyApi() {
  const settingsSet = vi.fn().mockResolvedValue({ ok: true as const });
  const api: WinLinkRouterApi = {
    appConfig: {
      get: vi.fn(),
      set: vi.fn(),
      exportSchemes: vi.fn(),
      importSchemes: vi.fn(),
    },
    settings: {
      set: settingsSet,
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
      evaluate: vi.fn(),
    },
  };

  return { api, settingsSet };
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

describe('SettingsPanel', () => {
  it('renders settings fields', () => {
    const { api } = createDummyApi();
    const config = createConfig();

    const html = renderToStaticMarkup(
      <SettingsPanel
        api={api}
        config={config}
        readOnly={false}
        onDidChangeSettings={() => undefined}
      />,
    );

    expect(html).toContain('Run at login');
    expect(html).toContain('Shared config path (optional)');
  });

  it('shows read-only warning when readOnly is true', () => {
    const { api } = createDummyApi();
    const config = createConfig();

    const html = renderToStaticMarkup(
      <SettingsPanel
        api={api}
        config={config}
        readOnly={true}
        onDidChangeSettings={() => undefined}
      />,
    );

    expect(html).toContain('Scheme/template editing is read-only.');
  });
});
