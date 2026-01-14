// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { AboutWindow } from './AboutWindow';

afterEach(() => {
  cleanup();
  delete (window as unknown as { winLinkRouter?: unknown }).winLinkRouter;
});

describe('AboutWindow', () => {
  it('renders title and buttons', () => {
    const api: Partial<WinLinkRouterApi> = {
      updates: {
        getStatus: vi.fn().mockResolvedValue({
          status: {
            stage: 'upToDate',
            currentVersion: '1.2.3',
            autoUpdatesEnabled: true,
          },
        }),
        checkNow: vi.fn().mockResolvedValue({ ok: true as const }),
        updateNow: vi.fn().mockResolvedValue({ ok: true as const }),
      },
      settings: {
        set: vi.fn().mockResolvedValue({ ok: true as const }),
        pickSharedConfigPath: vi.fn(),
      } as unknown as WinLinkRouterApi['settings'],
    };

    (window as unknown as { winLinkRouter?: unknown }).winLinkRouter =
      api as WinLinkRouterApi;

    render(
      <MantineTestProvider>
        <AboutWindow />
      </MantineTestProvider>,
    );

    expect(screen.getByText(/win-link-router/i)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: /check for updates/i }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: /update now/i })).toBeTruthy();
  });
});
