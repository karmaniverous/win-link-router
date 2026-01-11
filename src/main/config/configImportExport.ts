/**
 * Requirements addressed:
 * - Import/export JSON config with validation and clear error behavior.
 * - Import/export is portable: schemes/templates are transferred; per-user
 *   settings (run-at-login, shared config path) are preserved locally.
 */
import type { AppConfig } from '../../core/config/appConfig';
import { parseAppConfig } from '../../core/config/appConfig.schema';
import { createDefaultAppConfig } from '../../core/config/createDefaultAppConfig';
import { readJsonFile, writeJsonFileAtomic } from './jsonFile';

export async function exportSchemesSnapshotToFile(opts: {
  appVersion?: string;
  config: AppConfig;
  filePath: string;
}): Promise<void> {
  const exported: AppConfig = {
    ...createDefaultAppConfig(opts.appVersion),
    schemes: opts.config.schemes,
  };

  await writeJsonFileAtomic(opts.filePath, exported);
}

export async function importSchemesSnapshotFromFile(opts: {
  appVersion?: string;
  currentConfig: AppConfig;
  filePath: string;
}): Promise<AppConfig> {
  const imported = parseAppConfig(await readJsonFile(opts.filePath));

  return {
    ...opts.currentConfig,
    appVersion: opts.appVersion ?? opts.currentConfig.appVersion,
    schemes: imported.schemes,
  };
}
