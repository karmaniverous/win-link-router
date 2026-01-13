import type { Tray } from 'electron';
import { describe, expect, it, vi } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import { maybeNotifyDefaultHandlerMismatch } from './maybeNotifyDefaultHandlerMismatch';
import { getAllSchemeStatusesFromConfig } from './protocolRegistration';

vi.mock('./protocolRegistration', () => {
  return {
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
    },
    schemes: [
      {
        scheme: 'TEL',
        enabled: true,
        registered: true,
        extractor: { pattern: '^tel:(?<n>.*)$', flags: 'i' },
        templates: [],
      },
    ],
  };
}

describe('maybeNotifyDefaultHandlerMismatch', () => {
  it('does nothing when platform is not win32', async () => {
    const displayBalloon = vi.fn();
    const tray = { displayBalloon };

    const res = await maybeNotifyDefaultHandlerMismatch({
      config: createConfig(),
      tray: tray as unknown as Tray,
      platform: 'darwin',
    });

    expect(res).toEqual({ notified: false });
    expect(displayBalloon).not.toHaveBeenCalled();
  });

  it('shows a tray balloon when mismatch exists', async () => {
    const displayBalloon = vi.fn();
    const tray = { displayBalloon };

    const mocked = vi.mocked(getAllSchemeStatusesFromConfig);
    mocked.mockResolvedValueOnce([
      {
        scheme: 'TEL',
        enabled: true,
        registered: true,
        defaultStatus: 'not-default',
        expectedProgId: 'win-link-router.url.tel',
        actualProgId: 'Other.ProgId',
      },
    ]);

    const res = await maybeNotifyDefaultHandlerMismatch({
      config: createConfig(),
      tray: tray as unknown as Tray,
      platform: 'win32',
    });

    expect(res).toEqual({ notified: true });
    expect(displayBalloon).toHaveBeenCalledTimes(1);

    const arg = displayBalloon.mock.calls[0]?.[0] as {
      title?: unknown;
      content?: unknown;
    };
    expect(arg.title).toBe('Default app not set for some protocols');
    expect(String(arg.content)).toMatch(/Not default:\s*TEL/i);
  });
});
