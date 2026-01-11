/**
 * Requirements addressed:
 * - Per-user JSON configuration storage (Electron userData).
 * - Shared-config-file mode (single source of truth for schemes; UI read-only
 *   on shared file errors).
 * - Validate loaded configuration (Zod) and fall back to a safe default.
 * - Schemes are canonicalized and duplicates are prevented at load time.
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

export interface AppConfigLoadResult {
  config: AppConfig;
  readOnly: boolean;
  warnings: string[];
}

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

async function readJsonFile(filePath: string): Promise<unknown> {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text) as unknown;
}

async function writeJsonFile(filePath: string, value: unknown): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp-${String(process.pid)}-${String(Date.now())}`;
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(tmpPath, text, 'utf8');

  try {
    await fs.rename(tmpPath, filePath);
  } catch {
    // Best-effort fallback for Windows rename semantics.
    await fs.copyFile(tmpPath, filePath);
    await fs.rm(tmpPath, { force: true });
  }
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
      canonicalSchemes.push({ ...scheme, scheme: normalized });
    } catch (err) {
      warnings.push(
        `Invalid scheme "${scheme.scheme}" was dropped: ${toErrorMessage(err)}`,
      );
    }
  }

  return { ...config, schemes: canonicalSchemes };
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

  async load(): Promise<AppConfigLoadResult> {
    const warnings: string[] = [];

    let localConfig: AppConfig;
    try {
      if (await fileExists(this.localPath)) {
        localConfig = parseAppConfig(await readJsonFile(this.localPath));
      } else {
        localConfig = createDefaultAppConfig(this.opts.appVersion);
        await writeJsonFile(this.localPath, localConfig);
      }
    } catch (err) {
      warnings.push(
        `Failed to load local config; using defaults: ${toErrorMessage(err)}`,
      );
      localConfig = createDefaultAppConfig(this.opts.appVersion);
      await writeJsonFile(this.localPath, localConfig);
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
        await writeJsonFile(sharedPath, {
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
    const canonicalNext = canonicalizeSchemes(next, warnings);

    const sharedPath = canonicalNext.settings.sharedConfigPath ?? null;
    if (!sharedPath) {
      const toWrite: AppConfig = {
        ...canonicalNext,
        appVersion: this.opts.appVersion ?? canonicalNext.appVersion,
      };
      await writeJsonFile(this.localPath, toWrite);
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
    await writeJsonFile(this.localPath, localToWrite);

    const sharedToWrite: AppConfig = {
      ...createDefaultAppConfig(this.opts.appVersion),
      schemes: canonicalNext.schemes,
    };
    await writeJsonFile(sharedPath, sharedToWrite);

    // Refresh cache from a load to re-check permissions/warnings.
    await this.load();
  }
}
