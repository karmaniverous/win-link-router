/**
 * Requirements addressed:
 * - JSON config + presets validation with safe fallback behavior (schema layer).
 * - Reject global regex flag "g" for determinism.
 * - Ensure extractor regex compiles (pattern + flags).
 * - Support scheme enablement distinct from desired Windows registration.
 * - Back-compat: if scheme.registered is missing, treat it as scheme.enabled.
 * - Validate new per-user settings:
 *   - runInBackground, autoEnableNewSchemes, autoRegisterNewSchemes.
 * - Enforce autoRegisterNewSchemes ⇒ autoEnableNewSchemes.
 * - Validate update settings (autoUpdatesEnabled) with a safe default.
 */
import { z } from 'zod';

import {
  APP_CONFIG_SCHEMA_VERSION,
  type AppConfig,
  type PresetsFile,
} from './appConfig';

function assertValidRegex(pattern: string, flags: string) {
  // Throws if invalid; used by zod refinements.
  RegExp(pattern, flags);
}

const extractorConfigSchema = z
  .object({
    pattern: z.string().min(1),
    flags: z.string().optional().default(''),
  })
  .superRefine(({ pattern, flags }, ctx) => {
    if (flags.includes('g')) {
      ctx.addIssue({
        code: 'custom',
        message: 'Extractor flags must not include "g" (global matching).',
        path: ['flags'],
      });
      return;
    }

    try {
      assertValidRegex(pattern, flags);
    } catch (err) {
      ctx.addIssue({
        code: 'custom',
        message: `Invalid extractor regex: ${(err as Error).message}`,
        path: ['pattern'],
      });
    }
  });

const templateConfigSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1),
  template: z.string().min(1),
  enabled: z.boolean().default(true),
});

const schemeConfigSchema = z
  .object({
    scheme: z.string().min(1),
    enabled: z.boolean().default(true),
    registered: z.boolean().optional(),
    extractor: extractorConfigSchema,
    templates: z.array(templateConfigSchema),
    presetId: z.string().min(1).optional(),
    derivedFromPresetId: z.string().min(1).optional(),
  })
  .transform((scheme) => ({
    ...scheme,
    registered: scheme.registered ?? scheme.enabled,
  }));

const appSettingsSchema = z
  .object({
    runInBackground: z.boolean().optional().default(false),
    runAtLogin: z.boolean().default(false),
    sharedConfigPath: z.string().min(1).optional().nullable(),
    routeLogMode: z.enum(['redacted', 'full']).optional().default('redacted'),
    autoEnableNewSchemes: z.boolean().optional().default(true),
    autoRegisterNewSchemes: z.boolean().optional().default(true),
    autoUpdatesEnabled: z.boolean().optional().default(true),
  })
  .superRefine(({ autoEnableNewSchemes, autoRegisterNewSchemes }, ctx) => {
    if (autoRegisterNewSchemes && !autoEnableNewSchemes) {
      ctx.addIssue({
        code: 'custom',
        message: 'autoRegisterNewSchemes implies autoEnableNewSchemes.',
        path: ['autoEnableNewSchemes'],
      });
    }
  });

const appConfigSchema = z.object({
  schemaVersion: z.literal(APP_CONFIG_SCHEMA_VERSION),
  appVersion: z.string().min(1).optional(),
  settings: appSettingsSchema,
  schemes: z.array(schemeConfigSchema),
});

const presetsFileSchema = z.object({
  schemaVersion: z.literal(APP_CONFIG_SCHEMA_VERSION),
  appVersion: z.string().min(1).optional(),
  presets: z.array(schemeConfigSchema),
});

export function parseAppConfig(value: unknown): AppConfig {
  return appConfigSchema.parse(value);
}

export function parsePresetsFile(value: unknown): PresetsFile {
  return presetsFileSchema.parse(value);
}
