// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { PresetsFile } from '../../core/config/appConfig';
import { AddSchemeDialog } from './AddSchemeDialog';

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
    ],
  };
}

describe('AddSchemeDialog (interaction)', () => {
  it('shows presets for TEL and can select them', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn();

    render(
      <AddSchemeDialog
        open={true}
        presets={createPresets()}
        existingSchemes={[]}
        onCancel={vi.fn()}
        onAdd={onAdd}
      />,
    );

    await user.type(screen.getByRole('textbox', { name: /^scheme$/i }), 'tel');

    const combo = screen.getByRole('combobox', { name: /initialize from/i });
    const option = within(combo).getByRole('option', {
      name: /preset:\s*tel\.whatsapp/i,
    });
    expect(option).toBeTruthy();

    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(onAdd).toHaveBeenCalledTimes(1);
    expect(onAdd.mock.calls[0]?.[0]).toMatchObject({
      scheme: 'TEL',
      derivedFromPresetId: 'tel.whatsapp',
      registered: true,
    });
  });
});
