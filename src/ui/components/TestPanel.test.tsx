import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { describe, expect, it, vi } from 'vitest';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
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
    test: {
      evaluate: impl,
    },
  };
}

describe('TestPanel', () => {
  it('renders placeholder when no scheme is selected', () => {
    const api = createApiWithEvaluate(
      vi.fn().mockResolvedValue({ evaluations: [] }),
    );

    const html = renderToStaticMarkup(
      <TestPanel
        api={api}
        scheme={null}
        testUri=""
        onChangeTestUri={() => undefined}
      />,
    );

    expect(html).toContain('Select a scheme to run tests.');
  });

  it('renders evaluations returned by the API', async () => {
    vi.useFakeTimers();
    const api = createApiWithEvaluate(
      vi.fn().mockResolvedValue({
        matchGroups: { number: '+15551234567' },
        evaluations: [
          {
            templateId: 't1',
            label: 'WhatsApp Desktop',
            enabled: true,
            renderedTarget: 'whatsapp://send?phone=+15551234567',
          },
        ],
      }),
    );

    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      const { createRoot } =
        require('react-dom/client') as typeof import('react-dom/client');
      const root = createRoot(container);
      root.render(
        <TestPanel
          api={api}
          scheme="TEL"
          testUri="tel:+1 555 123 4567"
          onChangeTestUri={() => undefined}
        />,
      );
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    await Promise.resolve();

    const html = container.innerHTML;
    expect(html).toContain('WhatsApp Desktop');
    expect(html).toContain('whatsapp://send?phone=+15551234567');

    vi.useRealTimers();
  });

  it('shows error when evaluation fails', async () => {
    vi.useFakeTimers();
    const api = createApiWithEvaluate(
      vi.fn().mockRejectedValue(new Error('failed to evaluate')),
    );

    const container = document.createElement('div');
    document.body.appendChild(container);

    act(() => {
      const { createRoot } =
        require('react-dom/client') as typeof import('react-dom/client');
      const root = createRoot(container);
      root.render(
        <TestPanel
          api={api}
          scheme="TEL"
          testUri="tel:+1 555 123 4567"
          onChangeTestUri={() => undefined}
        />,
      );
    });

    act(() => {
      vi.advanceTimersByTime(350);
    });

    await Promise.resolve();

    const html = container.innerHTML;
    expect(html).toContain('failed to evaluate');

    vi.useRealTimers();
  });
});
