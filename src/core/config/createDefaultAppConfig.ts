/**
 * Requirements addressed:
 * - Per-user JSON config with schema versioning.
 * - Default onboarding state supports first-run preset selection in the UI.
 * - Config records app package version for traceability.
 * - Default per-user settings include lifecycle and new-scheme defaults.
 * - Default per-user settings include auto-updates enabled by default.
 */
import { APP_CONFIG_SCHEMA_VERSION, type AppConfig } from './appConfig';

export function createDefaultAppConfig(appVersion?: string): AppConfig {
  return {
    schemaVersion: APP_CONFIG_SCHEMA_VERSION,
    appVersion,
    settings: {
      runInBackground: false,
      runAtLogin: false,
      sharedConfigPath: null,
      routeLogMode: 'redacted',
      autoEnableNewSchemes: true,
      autoRegisterNewSchemes: true,
      onboardingCompleted: false,
      autoUpdatesEnabled: true,
    },
    schemes: [],
  };
}
