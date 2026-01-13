// @vitest-environment jsdom
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { SettingsPanel } from './SettingsPanel';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    settings: {
      runAtLogin: false,
      sharedConfigPath: null,
      runInBackground: false,
      autoEnableNewSchemes: true,
      autoRegisterNewSchemes: true,
      routeLogMode: 'redacted',
    },
    schemes: [],
    ...overrides,
  };
}

function createApi(opts: {
  pickResult: { cancelled: true } | { cancelled: false; filePath: string };
  settingsSet?: WinLinkRouterApi['settings']['set'];
}): { api: WinLinkRouterApi; settingsSet: ReturnType<typeof vi.fn> } {
  const settingsSet =
    opts.settingsSet ??
    (vi.fn().mockResolvedValue({ ok: true as const }) as ReturnType<
      typeof vi.fn
    >);

  const api: WinLinkRouterApi = {
    appConfig: {
      get: vi.fn(),
      set: vi.fn(),
      exportSchemes: vi.fn(),
      importSchemes: vi.fn(),
    },
    settings: {
      set: settingsSet as unknown as WinLinkRouterApi['settings']['set'],
      pickSharedConfigPath: vi.fn().mockResolvedValue(opts.pickResult),
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

  return { api, settingsSet: settingsSet as ReturnType<typeof vi.fn> };
}

function wasCalledWithSharedPath(
  calls: unknown[],
  expectedPath: string,
): boolean {
  for (const call of calls) {
    if (typeof call !== 'object' || call === null) continue;
    const rec = call as Record<string, unknown>;
    if (typeof rec.sharedConfigPath !== 'string') continue;
    if (rec.sharedConfigPath === expectedPath) return true;
  }
  return false;
}

describe('SettingsPanel (interaction)', () => {
  it('can browse for a shared config path and persist it', async () => {
    const user = userEvent.setup();

    const { api, settingsSet } = createApi({
      pickResult: { cancelled: false, filePath: 'C:\\x\\shared.json' },
    });

    render(
      <MantineTestProvider>
        <SettingsPanel
          api={api}
          config={createConfig()}
          readOnly={false}
          onDidChangeSettings={vi.fn()}
        />
      </MantineTestProvider>,
    );

    await user.click(screen.getByRole('button', { name: /browse/i }));

    expect(api.settings.pickSharedConfigPath).toHaveBeenCalledTimes(1);
    const input = screen.getByRole('textbox', {
      name: /shared config path/i,
    });
    expect(input.value).toBe('C:\\x\\shared.json');

    // Debounced autosave should persist the new shared config path.
    await waitFor(() => {
      expect(settingsSet).toHaveBeenCalled();
      const calls = settingsSet.mock.calls as unknown[][];
      const args = calls.map((call) => call[0]);
      expect(wasCalledWithSharedPath(args, 'C:\\x\\shared.json')).toBe(true);
    });
  });
});
