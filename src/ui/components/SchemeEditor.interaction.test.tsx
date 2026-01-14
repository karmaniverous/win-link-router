// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { SchemeConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { SchemeEditor } from './SchemeEditor';

afterEach(() => {
  cleanup();
});

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
      pickSharedConfigPath: vi.fn(),
    },
    presets: { get: vi.fn() },
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
    test: { evaluate: vi.fn() },
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

function createScheme(): SchemeConfig {
  return {
    scheme: 'TEL',
    enabled: true,
    registered: true,
    extractor: { pattern: '^tel:(?<number>.*)$', flags: 'i' },
    templates: [],
  };
}

describe('SchemeEditor (interaction)', () => {
  it('does not call window.confirm for destructive actions', async () => {
    const w = window as unknown as { confirm: (message?: string) => boolean };
    const originalConfirm = w.confirm;
    w.confirm = () => {
      throw new Error('confirm() is not supported.');
    };

    try {
      const user = userEvent.setup();
      const onRemoveScheme = vi.fn();

      render(
        <MantineTestProvider>
          <SchemeEditor
            api={createDummyApi()}
            presets={null}
            readOnly={false}
            scheme={createScheme()}
            onChangeScheme={vi.fn()}
            onRemoveScheme={onRemoveScheme}
          />
        </MantineTestProvider>,
      );

      await user.click(screen.getByRole('button', { name: /^remove$/i }));
      const dialog = screen.getByRole('dialog', { name: /remove scheme/i });
      expect(dialog).toBeTruthy();

      await user.click(
        within(dialog).getByRole('button', { name: /^remove$/i }),
      );
      expect(onRemoveScheme).toHaveBeenCalledWith('TEL');
    } finally {
      w.confirm = originalConfirm;
    }
  });
});
