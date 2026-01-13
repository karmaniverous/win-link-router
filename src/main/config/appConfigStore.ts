/**
 * Requirements addressed:
 * - Per-user JSON configuration storage (Electron userData).
 * - Shared-config-file mode (single source of truth for schemes; UI read-only
 *   on shared file errors).
 * - Validate loaded configuration (Zod) and fall back to a safe default.
 * - Schemes are canonicalized and duplicates are prevented at load time.
 * - Schemes are sorted canonically by scheme name.
 * - Scheme enablement is distinct from registration; enforce registered ⇒ enabled.
 * - Even when shared config is broken (read-only), settings must be editable so
 *   users can fix/disable shared mode.
 */
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

import {
  type AppConfig,
  normalizeScheme,
  type SchemeConfig,
} from '../../core/config/appConfig';
import { parseAppConfig } from '../../core/config/appConfig.schema';
import { createDefaultAppConfig } from '../../core/config/createDefaultAppConfig';
import {
  fileExists,
  readJsonFile,
  toErrorMessage,
  writeJsonFileAtomic,
} from './jsonFile';

interface AppConfigLoadResult {
  config: AppConfig;
  readOnly: boolean;
  warnings: string[];
}

function canonicalizeSettings(
  settings: AppConfig['settings'],
): AppConfig['settings'] {
  const runInBackground = settings.runInBackground ?? false;
  const runAtLogin = settings.runAtLogin;

  // Enforce SWL ⇒ RIB.
  const effectiveRunInBackground = runAtLogin || runInBackground;

  const autoEnableNewSchemes = settings.autoEnableNewSchemes ?? true;
  const autoRegisterNewSchemes = settings.autoRegisterNewSchemes ?? true;
  const effectiveAutoEnable = autoRegisterNewSchemes || autoEnableNewSchemes;

  return {
    ...settings,
    runInBackground: effectiveRunInBackground,
    autoEnableNewSchemes: effectiveAutoEnable,
    autoRegisterNewSchemes,
  };
}

function canonicalizeSchemes(config: AppConfig, warnings: string[]): AppConfig {
  const seen = new Set<string>();
  const canonicalSchemes: SchemeConfig[] = [];

  for (const scheme of config.schemes) {
    try {
      const normalized = normalizeScheme(scheme.scheme);
      if (seen.has(normalized)) {
        warnings.push(`Duplicate scheme "${normalized}" was dropped.`);
        continue;
      }
      seen.add(normalized);

      // Compatibility default: if registered is missing, treat enabled as the
      // prior "enabled implies registered" intent.
      const registered =
        scheme.registered !== undefined ? scheme.registered : scheme.enabled;

      // Enforce registered ⇒ enabled.
      const enabled = registered ? true : scheme.enabled;
      if (registered && !scheme.enabled) {
        warnings.push(
          `Scheme "${normalized}" was registered but disabled; it was enabled to satisfy registered ⇒ enabled.`,
        );
      }

      canonicalSchemes.push({
        ...scheme,
        scheme: normalized,
        enabled,
        registered,
      });
    } catch (err) {
      warnings.push(
        `Invalid scheme "${scheme.scheme}" was dropped: ${toErrorMessage(err)}`,
      );
    }
  }

  canonicalSchemes.sort((a, b) => a.scheme.localeCompare(b.scheme));

  return {
    ...config,
    settings: canonicalizeSettings(config.settings),
    schemes: canonicalSchemes,
  };
}

export class AppConfigStore {
  private localPath: string;
  private cached: AppConfig | null = null;
  private cachedWarnings: string[] = [];
  private cachedReadOnly = false;

  constructor(
    private opts: {
      userDataDir: string;
      appVersion?: string;
    },
  ) {
    this.localPath = path.join(opts.userDataDir, 'config.json');
  }

  getLoadedConfig(): AppConfig {
    if (!this.cached) {
      throw new Error('Config has not been loaded yet.');
    }
    return this.cached;
  }

  getLoadWarnings(): string[] {
    return [...this.cachedWarnings];
  }

  isReadOnly(): boolean {
    return this.cachedReadOnly;
  }

  /**
   * Save per-user settings even if the config is currently read-only due to a
   * broken shared config path. This enables recovery (disable or repoint shared
   * mode) without allowing edits to schemes/templates while read-only.
   */
  async saveSettings(nextSettings: AppConfig['settings']): Promise<void> {
    const current = this.cached ?? createDefaultAppConfig(this.opts.appVersion);
    const appVersion = this.opts.appVersion ?? current.appVersion;

    const localToWrite: AppConfig = {
      ...current,
      appVersion,
      settings: canonicalizeSettings(nextSettings),
    };

    // If disabling shared mode, preserve the currently effective schemes into
    // the local config file (so turning off shared mode doesn't wipe rules).
    if (!nextSettings.sharedConfigPath) {
      localToWrite.schemes = current.schemes;
    }

    await writeJsonFileAtomic(this.localPath, localToWrite);

    // Refresh cache and readOnly state.
    this.cached = null;
    this.cachedWarnings = [];
    this.cachedReadOnly = false;
    await this.load();
  }

  async load(): Promise<AppConfigLoadResult> {
    const warnings: string[] = [];

    let localConfig: AppConfig;
    try {
      if (await fileExists(this.localPath)) {
        localConfig = parseAppConfig(await readJsonFile(this.localPath));
      } else {
        localConfig = createDefaultAppConfig(this.opts.appVersion);
        await writeJsonFileAtomic(this.localPath, localConfig);
      }
    } catch (err) {
      warnings.push(
        `Failed to load local config; using defaults: ${toErrorMessage(err)}`,
      );
      localConfig = createDefaultAppConfig(this.opts.appVersion);
      await writeJsonFileAtomic(this.localPath, localConfig);
    }

    localConfig = canonicalizeSchemes(localConfig, warnings);

    const sharedPath = localConfig.settings.sharedConfigPath ?? null;
    if (!sharedPath) {
      this.cached = {
        ...localConfig,
        appVersion: this.opts.appVersion ?? localConfig.appVersion,
      };
      this.cachedWarnings = warnings;
      this.cachedReadOnly = false;
      return { config: this.cached, warnings, readOnly: false };
    }

    // Shared mode: schemes come from the shared file; settings are per-user.
    try {
      const sharedExists = await fileExists(sharedPath);
      if (!sharedExists) {
        // Seed the shared file from the local config (schemes only).
        await writeJsonFileAtomic(sharedPath, {
          ...createDefaultAppConfig(this.opts.appVersion),
          schemes: localConfig.schemes,
        });
      }

      const sharedConfig = canonicalizeSchemes(
        parseAppConfig(await readJsonFile(sharedPath)),
        warnings,
      );

      // Check write access for the shared file. If this fails, UI must be read-only.
      await fs.access(sharedPath, fsConstants.W_OK);

      this.cached = {
        ...sharedConfig,
        settings: localConfig.settings,
        appVersion: this.opts.appVersion ?? sharedConfig.appVersion,
      };
      this.cachedWarnings = warnings;
      this.cachedReadOnly = false;
      return { config: this.cached, warnings, readOnly: false };
    } catch (err) {
      warnings.push(
        `Shared config is unavailable; UI is read-only: ${toErrorMessage(err)}`,
      );
      this.cached = {
        ...localConfig,
        appVersion: this.opts.appVersion ?? localConfig.appVersion,
      };
      this.cachedWarnings = warnings;
      this.cachedReadOnly = true;
      return { config: this.cached, warnings, readOnly: true };
    }
  }

  async save(next: AppConfig): Promise<void> {
    if (this.cachedReadOnly) {
      throw new Error('Config is read-only due to shared config errors.');
    }

    const warnings: string[] = [];
    const canonicalNext = canonicalizeSchemes(
      { ...next, settings: canonicalizeSettings(next.settings) },
      warnings,
    );

    const sharedPath = canonicalNext.settings.sharedConfigPath ?? null;
    if (!sharedPath) {
      const toWrite: AppConfig = {
        ...canonicalNext,
        appVersion: this.opts.appVersion ?? canonicalNext.appVersion,
      };
      await writeJsonFileAtomic(this.localPath, toWrite);
      this.cached = toWrite;
      this.cachedWarnings = warnings;
      this.cachedReadOnly = false;
      return;
    }

    // Shared mode: persist settings locally and schemes to shared path.
    const localToWrite: AppConfig = {
      ...createDefaultAppConfig(this.opts.appVersion),
      settings: canonicalNext.settings,
    };
    await writeJsonFileAtomic(this.localPath, localToWrite);

    const sharedToWrite: AppConfig = {
      ...createDefaultAppConfig(this.opts.appVersion),
      schemes: canonicalNext.schemes,
    };
    await writeJsonFileAtomic(sharedPath, sharedToWrite);

    // Refresh cache from a load to re-check permissions/warnings.
    await this.load();
  }
}
