/**
 * Requirements addressed:
 * - UI must autosave config changes (via IPC in main/preload; renderer stays UI-only).
 * - Shared config file errors force read-only UI.
 * - UI test panel needs per-template rendered output / render errors.
 */
import { ipcMain } from 'electron';

import {
  findSchemeConfig,
  normalizeScheme,
  type PresetsFile,
} from '../../core/config/appConfig';
import { parseAppConfig } from '../../core/config/appConfig.schema';
import {
  evaluateTemplatesForTest,
  type TemplateEvaluation,
} from '../../core/routing/routeUri';
import type { TemplateRenderer } from '../../core/routing/templateRenderer';
import type { AppConfigStore } from '../config/appConfigStore';

export interface TestEvaluateResponse {
  matchGroups?: Record<string, string>;
  evaluations: TemplateEvaluation[];
  error?: string;
}

export function registerIpcHandlers(opts: {
  configStore: AppConfigStore;
  getPresets: () => PresetsFile;
  renderer: TemplateRenderer;
}) {
  ipcMain.handle('appConfig:get', async () => {
    const { config, readOnly, warnings } = await opts.configStore.load();
    return { config, readOnly, warnings };
  });

  ipcMain.handle('appConfig:set', async (_event, next: unknown) => {
    const parsed = parseAppConfig(next);
    await opts.configStore.save(parsed);
    return { ok: true };
  });

  ipcMain.handle('presets:get', () => opts.getPresets());

  ipcMain.handle(
    'test:evaluate',
    (
      _event,
      req: { scheme: string; uri: string },
    ): Promise<TestEvaluateResponse> => {
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
