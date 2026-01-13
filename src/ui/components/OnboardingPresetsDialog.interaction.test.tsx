// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PresetsFile } from '../../core/config/appConfig';
import { MantineTestProvider } from '../test/MantineTestProvider';
import { OnboardingPresetsDialog } from './OnboardingPresetsDialog';

afterEach(() => {
  cleanup();
});

function createPresets(): PresetsFile {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    presets: [
      {
        presetId: 'tel.whatsapp',
        scheme: 'TEL',
        enabled: true,
        registered: true,
        extractor: { pattern: '^tel:(?<number>.*)$', flags: 'i' },
        templates: [
          {
            id: 'whatsapp.web',
            label: 'WhatsApp Web',
            template: 'https://wa.me/{{digits number}}',
            enabled: true,
          },
        ],
      },
      {
        presetId: 'tel.alt',
        scheme: 'TEL',
        enabled: true,
        registered: true,
        extractor: { pattern: '^tel:(?<number>.*)$', flags: 'i' },
        templates: [
          {
            id: 'x',
            label: 'Alt',
            template: 'https://example.com/{{digits number}}',
            enabled: true,
          },
        ],
      },
      {
        presetId: 'mailto.basic',
        scheme: 'MAILTO',
        enabled: true,
        registered: true,
        extractor: { pattern: '^mailto:(?<addr>.*)$', flags: 'i' },
        templates: [
          {
            id: 'm',
            label: 'Mail',
            template: 'https://example.com/{{addr}}',
            enabled: true,
          },
        ],
      },
    ],
  };
}

describe('OnboardingPresetsDialog (interaction)', () => {
  it('preselects TEL WhatsApp and applies selected presets', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn();

    render(
      <MantineTestProvider>
        <OnboardingPresetsDialog
          open={true}
          presets={createPresets()}
          onSkip={vi.fn()}
          onApply={onApply}
        />
      </MantineTestProvider>,
    );

    const telGroup = screen.getByRole('radiogroup', { name: 'TEL' });
    const telWhatsapp = within(telGroup).getByRole<HTMLInputElement>('radio', {
      name: /tel\.whatsapp/i,
    });
    expect(telWhatsapp.checked).toBe(true);

    // Switching TEL should still keep it as a single choice (radio behavior).
    await user.click(
      within(telGroup).getByRole('radio', { name: /tel\.alt/i }),
    );
    expect(telWhatsapp.checked).toBe(false);

    await user.click(screen.getByRole('button', { name: /apply presets/i }));

    expect(onApply).toHaveBeenCalledTimes(1);
    const added = onApply.mock.calls[0]?.[0] as unknown[];
    expect(added).toHaveLength(1);
    expect(added[0]).toMatchObject({
      scheme: 'TEL',
      derivedFromPresetId: 'tel.alt',
      registered: true,
    });
  });
});
