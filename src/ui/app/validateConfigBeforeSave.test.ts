import { describe, expect, it } from 'vitest';

import type { AppConfig } from '../../core/config/appConfig';
import { validateConfigBeforeSave } from './validateConfigBeforeSave';

function createConfig(overrides: Partial<AppConfig> = {}): AppConfig {
  return {
    schemaVersion: 1,
    appVersion: '0.0.0',
    settings: { runAtLogin: false, sharedConfigPath: null },
    schemes: [
      {
        scheme: 'TEL',
        enabled: true,
        registered: true,
        extractor: { pattern: '^tel:(?<n>.*)$', flags: 'i' },
        templates: [
          {
            id: 't1',
            label: 'A',
            template: 'https://example.com/{{n}}',
            enabled: true,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('validateConfigBeforeSave', () => {
  it('returns null for a valid config', () => {
    expect(validateConfigBeforeSave(createConfig())).toBeNull();
  });

  it('rejects extractor flags containing g', () => {
    const cfg = createConfig({
      schemes: [
        {
          ...createConfig().schemes[0],
          extractor: { pattern: '^tel:(?<n>.*)$', flags: 'ig' },
        },
      ],
    });
    expect(validateConfigBeforeSave(cfg)).toMatch(/must not include "g"/);
  });

  it('rejects invalid extractor regex', () => {
    const cfg = createConfig({
      schemes: [
        {
          ...createConfig().schemes[0],
          extractor: { pattern: '(', flags: '' },
        },
      ],
    });
    expect(validateConfigBeforeSave(cfg)).toMatch(/extractor regex is invalid/);
  });

  it('rejects empty template strings', () => {
    const cfg = createConfig({
      schemes: [
        {
          ...createConfig().schemes[0],
          templates: [
            {
              id: 't1',
              label: 'A',
              template: '   ',
              enabled: true,
            },
          ],
        },
      ],
    });
    expect(validateConfigBeforeSave(cfg)).toMatch(/template "A" is empty/);
  });
});
