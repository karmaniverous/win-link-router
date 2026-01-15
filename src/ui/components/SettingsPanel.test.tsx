// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { SettingsPanel } from './SettingsPanel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function createDummyApi(): {
  api: WinLinkRouterApi;
  settingsSet: ReturnType<typeof vi.fn>;
} {
  const settingsSet = vi.fn().mockResolvedValue({ ok: true as const });
  return {
    api: {
      appConfig: {
        get: vi.fn(),
        set: vi.fn(),
        exportSchemes: vi.fn(),
        importSchemes: vi.fn(),
      },
      settings: {
        set: settingsSet as unknown as WinLinkRouterApi['settings']['set'],
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
    },
    settingsSet,
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

describe('SettingsPanel', () => {
  it('renders settings fields', () => {
    const { api } = createDummyApi();
    const config = createConfig();

    render(
      <MantineTestProvider>
        <SettingsPanel
          api={api}
          config={config}
          readOnly={false}
          onDidChangeSettings={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(
      screen.getByRole('switch', { name: /run in background/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: /start on windows login/i }),
    ).toBeTruthy();
    expect(
      screen.getByRole('switch', { name: /use shared config/i }),
    ).toBeTruthy();

    expect(
      screen.queryByRole('textbox', { name: /shared config path/i }),
    ).toBeNull();
  });

  it('does not persist settings during initial hydration', async () => {
    vi.useFakeTimers();

    const { api, settingsSet } = createDummyApi();
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        runInBackground: true,
        runAtLogin: false,
        sharedConfigPath: 'C:\\x\\shared.json',
      },
    });

    render(
      <MantineTestProvider>
        <SettingsPanel
          api={api}
          config={config}
          readOnly={false}
          onDidChangeSettings={vi.fn()}
        />
      </MantineTestProvider>,
    );

    // Let debounce timers run; initial hydration must not trigger a write.
    await vi.advanceTimersByTimeAsync(2000);

    expect(settingsSet).not.toHaveBeenCalled();
  });

  it('shows shared config path row when shared config is enabled', async () => {
    const { api } = createDummyApi();
    const config = createConfig({
      settings: {
        ...createConfig().settings,
        sharedConfigPath: 'C:\\x\\shared.json',
      },
    });

    render(
      <MantineTestProvider>
        <SettingsPanel
          api={api}
          config={config}
          readOnly={false}
          onDidChangeSettings={vi.fn()}
        />
      </MantineTestProvider>,
    );

    const toggle = screen.getByRole<HTMLInputElement>('switch', {
      name: /use shared config/i,
    });
    expect(toggle.checked).toBe(true);

    const input = await screen.findByRole<HTMLInputElement>('textbox', {
      name: /shared config path/i,
    });
    expect(input.value).toBe('C:\\x\\shared.json');
  });

  it('shows read-only warning when readOnly is true', () => {
    const { api } = createDummyApi();
    const config = createConfig();

    render(
      <MantineTestProvider>
        <SettingsPanel
          api={api}
          config={config}
          readOnly={true}
          onDidChangeSettings={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(
      screen.getByText(/scheme\/template editing is read-only/i),
    ).toBeTruthy();
  });
});
