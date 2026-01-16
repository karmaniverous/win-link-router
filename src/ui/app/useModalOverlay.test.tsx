// @vitest-environment jsdom
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { useModalOverlay } from './useModalOverlay';

afterEach(() => {
  cleanup();
});

function TestHarness(props: { api: WinLinkRouterApi }) {
  const active = useModalOverlay(props.api);
  return <div>{active ? 'overlay-on' : 'overlay-off'}</div>;
}

describe('useModalOverlay', () => {
  it('turns on when any owner is active and off when cleared', () => {
    const handlerRef: {
      fn?: (evt: { owner: string; active: boolean }) => void;
    } = {};

    const api = {
      ui: {
        onModalOverlayChanged: vi.fn((fn) => {
          handlerRef.fn = fn as typeof handlerRef.fn;
          return () => {
            handlerRef.fn = undefined;
          };
        }),
      },
    } as unknown as WinLinkRouterApi;

    render(<TestHarness api={api} />);

    expect(screen.getByText('overlay-off')).toBeTruthy();

    act(() => {
      handlerRef.fn?.({ owner: 'about', active: true });
    });
    expect(screen.getByText('overlay-on')).toBeTruthy();

    // Multiple owners should keep overlay on until all are cleared.
    act(() => {
      handlerRef.fn?.({ owner: 'share', active: true });
    });
    expect(screen.getByText('overlay-on')).toBeTruthy();

    act(() => {
      handlerRef.fn?.({ owner: 'about', active: false });
    });
    expect(screen.getByText('overlay-on')).toBeTruthy();

    act(() => {
      handlerRef.fn?.({ owner: 'share', active: false });
    });
    expect(screen.getByText('overlay-off')).toBeTruthy();
  });
});
