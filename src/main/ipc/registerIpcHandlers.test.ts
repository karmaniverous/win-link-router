import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';

const handlers = new Map<
  string,
  (event: unknown, ...args: unknown[]) => unknown
>();

vi.mock('electron', () => {
  return {
    app: {
      getPath: vi.fn(),
      getVersion: vi.fn(),
      setLoginItemSettings: vi.fn(),
    },
    dialog: {
      showSaveDialog: vi.fn(),
      showOpenDialog: vi.fn(),
    },
    ipcMain: {
      handle: vi.fn((channel: unknown, handler: unknown) => {
        if (typeof channel !== 'string') return;
        if (typeof handler !== 'function') return;
        handlers.set(
          channel,
          handler as (event: unknown, ...args: unknown[]) => unknown,
        );
      }),
    },
  };
});

vi.mock('../windows/protocolRegistration', () => {
  return {
    ensureCandidateRegistration: vi
      .fn()
      .mockResolvedValue({ ok: true, warnings: [] }),
    getAllSchemeStatusesFromConfig: vi.fn(),
  };
});

function createConfig(): AppConfig {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    settings: {
      runAtLogin: false,
      sharedConfigPath: null,
      routeLogMode: 'redacted',
      runInBackground: false,
      autoEnableNewSchemes: true,
      autoRegisterNewSchemes: true,
    },
    schemes: [
      {
        scheme: 'TEL',
        enabled: true,
        registered: true,
        extractor: { pattern: '^tel:(?<n>.*)$', flags: 'i' },
        templates: [
          {
            id: 't1',
            label: 'A',
            template: 'https://example.com/{{n}}',
            enabled: true,
          },
        ],
      },
      {
        scheme: 'MAILTO',
        enabled: true,
        registered: false,
        extractor: { pattern: '^mailto:(?<addr>.*)$', flags: 'i' },
        templates: [
          {
            id: 't1',
            label: 'B',
            template: 'https://example.com/{{addr}}',
            enabled: true,
          },
        ],
      },
    ],
  };
}

describe('registerIpcHandlers', () => {
  it('reconciles candidate registration on appConfig:set when packaged', async () => {
    handlers.clear();

    const { registerIpcHandlers } = await import('./registerIpcHandlers');
    const { ensureCandidateRegistration } =
      await import('../windows/protocolRegistration');

    let loaded = createConfig();

    const configStore = {
      load: vi.fn(),
      getLoadedConfig: vi.fn(() => loaded),
      save: vi.fn(async (next: AppConfig) => {
        loaded = next;
      }),
      saveSettings: vi.fn(),
    };

    const logStore = {
      setMode: vi.fn(),
      read: vi.fn(),
      clear: vi.fn(),
      append: vi.fn(),
    };

    registerIpcHandlers({
      configStore: configStore as unknown as Parameters<
        typeof registerIpcHandlers
      >[0]['configStore'],
      logStore: logStore as unknown as Parameters<
        typeof registerIpcHandlers
      >[0]['logStore'],
      getPresets: () => ({
        schemaVersion: 1,
        appVersion: '0.0.0',
        presets: [],
      }),
      renderer: { render: () => 'x' },
      appVersion: '0.0.0',
      isPackaged: true,
      exePath: 'C:\\x\\win-link-router.exe',
    });

    const handler = handlers.get('appConfig:set');
    expect(handler).toBeTruthy();

    await handler?.({}, loaded);

    expect(ensureCandidateRegistration).toHaveBeenCalledTimes(1);
    const arg = (
      ensureCandidateRegistration as unknown as { mock: { calls: unknown[][] } }
    ).mock.calls[0]?.[0] as { registeredSchemes?: unknown };
    expect(arg.registeredSchemes).toEqual(['TEL']);
  });

  it('does not reconcile candidate registration on appConfig:set when not packaged', async () => {
    handlers.clear();

    const { registerIpcHandlers } = await import('./registerIpcHandlers');
    const { ensureCandidateRegistration } =
      await import('../windows/protocolRegistration');

    let loaded = createConfig();

    const configStore = {
      load: vi.fn(),
      getLoadedConfig: vi.fn(() => loaded),
      save: vi.fn(async (next: AppConfig) => {
        loaded = next;
      }),
      saveSettings: vi.fn(),
    };

    const logStore = {
      setMode: vi.fn(),
      read: vi.fn(),
      clear: vi.fn(),
      append: vi.fn(),
    };

    registerIpcHandlers({
      configStore: configStore as unknown as Parameters<
        typeof registerIpcHandlers
      >[0]['configStore'],
      logStore: logStore as unknown as Parameters<
        typeof registerIpcHandlers
      >[0]['logStore'],
      getPresets: () => ({
        schemaVersion: 1,
        appVersion: '0.0.0',
        presets: [],
      }),
      renderer: { render: () => 'x' },
      appVersion: '0.0.0',
      isPackaged: false,
      exePath: 'C:\\x\\win-link-router.exe',
    });

    const handler = handlers.get('appConfig:set');
    expect(handler).toBeTruthy();

    await handler?.({}, loaded);

    expect(ensureCandidateRegistration).toHaveBeenCalledTimes(0);
  });
});
