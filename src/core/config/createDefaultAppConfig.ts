/**
 * Requirements addressed:
 * - Per-user JSON config with schema versioning.
 * - Config records app package version for traceability.
 */
import { APP_CONFIG_SCHEMA_VERSION, type AppConfig } from './appConfig';

export function createDefaultAppConfig(appVersion?: string): AppConfig {
  return {
    schemaVersion: APP_CONFIG_SCHEMA_VERSION,
    appVersion,
    settings: {
      runAtLogin: false,
      sharedConfigPath: null,
      routeLogMode: 'redacted',
    },
    schemes: [],
  };
}
