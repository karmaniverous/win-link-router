/**
 * Requirements addressed:
 * - UI must autosave config changes (via IPC in main/preload; renderer stays UI-only).
 * - Shared config file errors force read-only UI.
 * - UI test panel needs per-template rendered output / render errors.
 * - Support import/export of schemes via JSON files (portable; settings preserved).
 * - Windows integration: registration + default handler status (read-only).
 * - Windows candidate registration is reconciled to match per-scheme config intent:
 *   - on explicit Ensure Registration, and
 *   - on config save (best-effort, packaged-only).
 *   - on shared-config-path changes via settings:set (best-effort, packaged-only).
 * - UI can open external links (e.g., GitHub repo) via main process.
 * - Main process can react to settings changes (e.g., update scheduling) via a callback.
 * - IPC must not assume config is already loaded; status calls must be robust
 *   during startup and during config reload windows.
 */
import path from 'node:path';

import { app, dialog, ipcMain } from 'electron';

import {
  findSchemeConfig,
  normalizeScheme,
  type PresetsFile,
} from '../../core/config/appConfig';
import { parseAppConfig } from '../../core/config/appConfig.schema';
import {
  evaluateTemplatesForTest,
  type RouteUriResult,
  type TemplateEvaluation,
} from '../../core/routing/routeUri';
import type { TemplateRenderer } from '../../core/routing/templateRenderer';
import type { AppConfigStore } from '../config/appConfigStore';
import {
  exportSchemesSnapshotToFile,
  importSchemesSnapshotFromFile,
} from '../config/configImportExport';
import type { RouteLogStore } from '../logging/routeLogStore';
import {
  clearLastRouteError,
  getLastRouteError,
} from '../routing/lastRouteError';
import { applyRunAtLoginSetting } from '../settings/applyRunAtLogin';
import { openWindowsDefaultApps } from '../windows/openDefaultApps';
import { openExternalUrl } from '../windows/openExternalUrl';
import {
  ensureCandidateRegistration,
  getAllSchemeStatusesFromConfig,
} from '../windows/protocolRegistration';

interface TestEvaluateResponse {
  matchGroups?: Record<string, string>;
  evaluations: TemplateEvaluation[];
  error?: string;
}

interface RouteLogGetResponse {
  entries: { seq: number; when: string; result: RouteUriResult }[];
}

export function registerIpcHandlers(opts: {
  configStore: AppConfigStore;
  logStore: RouteLogStore;
  getPresets: () => PresetsFile;
  renderer: TemplateRenderer;
  appVersion: string;
  isPackaged: boolean;
  exePath: string;
  onSettingsChanged?: (
    next: Parameters<AppConfigStore['saveSettings']>[0],
  ) => Promise<{ warnings?: string[] } | undefined> | undefined;
}) {
  async function reconcileRegistrationForLoadedConfig(): Promise<void> {
    // Packaged-only: in dev, protocol registration is intentionally disabled.
    // Keep save fast and avoid noisy warnings in non-packaged runs.
    if (!opts.isPackaged) return;

    const config = opts.configStore.getLoadedConfig();
    const registeredSchemes = config.schemes
      .filter((s) => s.enabled && s.registered)
      .map((s) => s.scheme);

    await ensureCandidateRegistration({
      isPackaged: opts.isPackaged,
      exePath: opts.exePath,
      appDisplayName: 'win-link-router',
      appDescription: 'Routes protocol links to configured targets',
      registeredSchemes,
    });
  }

  ipcMain.handle('appConfig:get', async () => {
    const { config, readOnly, warnings } = await opts.configStore.load();
    return { config, readOnly, warnings };
  });

  ipcMain.handle('appConfig:set', async (_event, next: unknown) => {
    const parsed = parseAppConfig(next);
    await opts.configStore.save(parsed);
    applyRunAtLoginSetting(opts.configStore.getLoadedConfig());
    opts.logStore.setMode(
      opts.configStore.getLoadedConfig().settings.routeLogMode ?? 'redacted',
    );
    await opts.onSettingsChanged?.(opts.configStore.getLoadedConfig().settings);
    // Best-effort: keep Windows candidate registration aligned to saved config.
    await reconcileRegistrationForLoadedConfig().catch(() => undefined);
    return { ok: true };
  });

  ipcMain.handle('presets:get', () => opts.getPresets());

  ipcMain.handle('appConfig:exportSchemes', async () => {
    const config = opts.configStore.getLoadedConfig();
    const defaultPath = path.join(
      process.cwd(),
      `win-link-router-config-${opts.appVersion}.json`,
    );

    const res = await dialog.showSaveDialog({
      title: 'Export win-link-router config',
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (res.canceled || !res.filePath) {
      return { cancelled: true as const };
    }

    await exportSchemesSnapshotToFile({
      appVersion: opts.appVersion,
      config,
      filePath: res.filePath,
    });

    return { cancelled: false as const, filePath: res.filePath };
  });

  ipcMain.handle('appConfig:importSchemes', async () => {
    const res = await dialog.showOpenDialog({
      title: 'Import win-link-router config',
      properties: ['openFile'],
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (res.canceled || res.filePaths.length === 0) {
      return { cancelled: true as const };
    }

    const filePath = res.filePaths[0];
    const current = opts.configStore.getLoadedConfig();
    const next = await importSchemesSnapshotFromFile({
      appVersion: opts.appVersion,
      currentConfig: current,
      filePath,
    });
    await opts.configStore.save(next);
    applyRunAtLoginSetting(opts.configStore.getLoadedConfig());
    // Best-effort: keep Windows candidate registration aligned to imported config.
    await reconcileRegistrationForLoadedConfig().catch(() => undefined);

    return {
      cancelled: false as const,
      filePath,
      importedSchemes: next.schemes.length,
    };
  });

  ipcMain.handle('settings:set', async (_event, patch: unknown) => {
    const current = opts.configStore.getLoadedConfig();
    const beforeShared = current.settings.sharedConfigPath ?? null;
    const parsed = parseAppConfig({
      ...current,
      settings: { ...current.settings, ...(patch as object) },
    });
    await opts.configStore.saveSettings(parsed.settings);
    applyRunAtLoginSetting(opts.configStore.getLoadedConfig());
    opts.logStore.setMode(
      opts.configStore.getLoadedConfig().settings.routeLogMode ?? 'redacted',
    );
    const changedResult = await opts.onSettingsChanged?.(
      opts.configStore.getLoadedConfig().settings,
    );
    const warningsRaw = changedResult?.warnings ?? [];
    const warnings = Array.isArray(warningsRaw)
      ? warningsRaw.filter((w): w is string => typeof w === 'string')
      : [];
    const afterShared =
      opts.configStore.getLoadedConfig().settings.sharedConfigPath ?? null;
    if (beforeShared !== afterShared) {
      await reconcileRegistrationForLoadedConfig().catch(() => undefined);
    }
    return {
      ok: true as const,
      warnings,
    };
  });

  ipcMain.handle('settings:pickSharedConfigPath', async () => {
    const defaultPath = path.join(
      app.getPath('documents'),
      `win-link-router-shared-config-${opts.appVersion}.json`,
    );

    const res = await dialog.showSaveDialog({
      title: 'Choose shared config file',
      defaultPath,
      filters: [{ name: 'JSON', extensions: ['json'] }],
    });

    if (res.canceled || !res.filePath) return { cancelled: true as const };

    return { cancelled: false as const, filePath: res.filePath };
  });

  ipcMain.handle('windows:ensureRegistration', async () => {
    const { config } = await opts.configStore.load();
    const registeredSchemes = config.schemes
      .filter((s) => s.enabled && s.registered)
      .map((s) => s.scheme);

    return ensureCandidateRegistration({
      isPackaged: opts.isPackaged,
      exePath: opts.exePath,
      appDisplayName: 'win-link-router',
      appDescription: 'Routes protocol links to configured targets',
      registeredSchemes,
    });
  });

  ipcMain.handle('windows:getSchemeStatuses', async () => {
    const { config } = await opts.configStore.load();
    return getAllSchemeStatusesFromConfig(config, {
      exePath: opts.exePath,
    });
  });

  ipcMain.handle('windows:openDefaultApps', async (_event, scheme?: string) => {
    await openWindowsDefaultApps({ scheme });
    return { ok: true };
  });

  ipcMain.handle('windows:openExternal', async (_event, url: unknown) => {
    if (typeof url !== 'string') {
      throw new Error('Invalid external URL (expected string).');
    }
    await openExternalUrl(url);
    return { ok: true as const };
  });

  ipcMain.handle('routing:getLastRouteError', () => {
    return getLastRouteError();
  });

  ipcMain.handle('routing:clearLastRouteError', () => {
    clearLastRouteError();
    return { ok: true };
  });

  ipcMain.handle('routeLog:get', async (): Promise<RouteLogGetResponse> => {
    const entries = await opts.logStore.read();
    return { entries };
  });

  ipcMain.handle('routeLog:clear', async () => {
    await opts.logStore.clear();
    return { ok: true };
  });

  ipcMain.handle(
    'test:evaluate',
    (_event, req: { scheme: string; uri: string }): TestEvaluateResponse => {
      const config = opts.configStore.getLoadedConfig();

      let schemeConfig;
      try {
        schemeConfig = findSchemeConfig(config, normalizeScheme(req.scheme));
      } catch (err) {
        return { evaluations: [], error: (err as Error).message };
      }

      if (!schemeConfig) {
        return {
          evaluations: [],
          error: `Scheme ${req.scheme} is not configured.`,
        };
      }

      const { match, evaluations } = evaluateTemplatesForTest(
        opts.renderer,
        req.uri,
        schemeConfig,
      );

      return {
        matchGroups: match?.groups ?? undefined,
        evaluations,
      };
    },
  );
}
