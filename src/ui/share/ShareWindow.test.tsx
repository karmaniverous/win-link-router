// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { ShareWindow } from './ShareWindow';

afterEach(() => {
  cleanup();
  delete (window as unknown as { winLinkRouter?: unknown }).winLinkRouter;
});

describe('ShareWindow', () => {
  it('renders share CTA content', () => {
    const api: Partial<WinLinkRouterApi> = {
      share: {
        open: vi.fn(),
        getContext: vi.fn().mockResolvedValue({
          context: {
            mode: 'manual',
            scheme: 'TEL',
            templateLabel: 'WhatsApp Desktop',
          },
        }),
        later: vi.fn().mockResolvedValue({ ok: true as const }),
        stopNagging: vi.fn().mockResolvedValue({ ok: true as const }),
        shareX: vi.fn().mockResolvedValue({ ok: true as const }),
        shareLinkedIn: vi.fn().mockResolvedValue({ ok: true as const }),
      },
    };

    (window as unknown as { winLinkRouter?: unknown }).winLinkRouter =
      api as WinLinkRouterApi;

    render(
      <MantineTestProvider>
        <ShareWindow />
      </MantineTestProvider>,
    );

    expect(
      screen.getByText(/like win-link-router\?\s*tell your friends!/i),
    ).toBeTruthy();
  });
});
