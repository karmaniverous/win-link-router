// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { AppConfig, PresetsFile } from '../../core/config/appConfig';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { SchemesSidebar } from './SchemesSidebar';

afterEach(() => {
  cleanup();
});

function createConfig(): AppConfig {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    settings: {
      runAtLogin: false,
      sharedConfigPath: null,
      routeLogMode: 'redacted',
    },
    schemes: [],
  };
}

function createPresets(): PresetsFile {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    presets: [],
  };
}

describe('SchemesSidebar (interaction)', () => {
  it('does not call window.prompt when adding a scheme', async () => {
    const w = window as unknown as {
      prompt: (message?: string) => string | null;
    };
    const originalPrompt = w.prompt;
    w.prompt = () => {
      throw new Error('prompt() is not supported.');
    };

    try {
      const user = userEvent.setup();
      const onAddScheme = vi.fn();
      const onError = vi.fn();

      render(
        <MantineTestProvider>
          <SchemesSidebar
            loading={false}
            readOnly={false}
            config={createConfig()}
            presets={createPresets()}
            statuses={[]}
            selectedScheme={null}
            onSelectScheme={vi.fn()}
            onRefreshAndReconcile={vi.fn()}
            onSetNewSchemeDefaults={vi.fn()}
            onChangeScheme={vi.fn()}
            onRemoveScheme={vi.fn()}
            onAddScheme={onAddScheme}
            onError={onError}
          />
        </MantineTestProvider>,
      );

      await user.click(screen.getByRole('button', { name: /add scheme/i }));
      expect(screen.getByRole('dialog', { name: /add scheme/i })).toBeTruthy();

      await user.type(
        screen.getByRole('textbox', { name: /^scheme$/i }),
        'tel',
      );
      await user.click(screen.getByRole('button', { name: /^add$/i }));

      expect(onError).not.toHaveBeenCalled();
      expect(onAddScheme).toHaveBeenCalledTimes(1);
      expect(onAddScheme.mock.calls[0]?.[0]).toMatchObject({ scheme: 'TEL' });
    } finally {
      w.prompt = originalPrompt;
    }
  });
});
