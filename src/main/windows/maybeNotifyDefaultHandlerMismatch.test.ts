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
    const tray = { displayBalloon: vi.fn() };

    const res = await maybeNotifyDefaultHandlerMismatch({
      config: createConfig(),
      tray: tray as unknown as Electron.Tray,
      platform: 'darwin',
    });

    expect(res).toEqual({ notified: false });
    expect(tray.displayBalloon).not.toHaveBeenCalled();
  });

  it('shows a tray balloon when mismatch exists', async () => {
    const tray = { displayBalloon: vi.fn() };

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
      tray: tray as unknown as Electron.Tray,
      platform: 'win32',
    });

    expect(res).toEqual({ notified: true });
    expect(tray.displayBalloon).toHaveBeenCalledTimes(1);

    const arg = (
      tray.displayBalloon as unknown as { mock: { calls: unknown[] } }
    ).mock.calls[0]?.[0] as { title?: unknown; content?: unknown };
    expect(arg.title).toBe('Default app not set for some protocols');
    expect(String(arg.content)).toMatch(/Not default:\s*TEL/i);
  });
});
