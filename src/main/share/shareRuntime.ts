/**
 * Requirements addressed:
 * - Share window is separate (manual + nag) and opened via IPC.
 * - After every NAG_INTERVAL successful routes, show a post-route nag window.
 * - Store nag state in a separate userData file (not config/import/export).
 * - Message uses scheme + template label; X mentions @karmaniverous.
 */
import type { BrowserWindow, IpcMain } from 'electron';

import type { AppConfig } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';
import { openExternalUrl } from '../windows/openExternalUrl';
import { NAG_INTERVAL } from './shareNagConstants';
import { ShareNagStateStore } from './shareNagStateStore';
import {
  deriveShareSubjectFromConfig,
  deriveShareSubjectFromRouteResult,
} from './shareSubject';
import { buildShareUrl, type SharePlatform } from './shareUrls';
import {
  type ShareContext,
  ShareWindowController,
} from './shareWindowController';

export class ShareRuntime {
  private nagStore: ShareNagStateStore;
  private winController: ShareWindowController;
  private currentContext: ShareContext | null = null;
  private ipcRegistered = false;

  constructor(opts: {
    userDataDir: string;
    getMainWindow: () => BrowserWindow | null;
    loadShareView: (win: BrowserWindow) => Promise<void>;
    getAllowedHttpOrigins: () => string[];
  }) {
    this.nagStore = new ShareNagStateStore({ userDataDir: opts.userDataDir });
    this.winController = new ShareWindowController({
      getMainWindow: opts.getMainWindow,
      loadShareView: opts.loadShareView,
      getAllowedHttpOrigins: opts.getAllowedHttpOrigins,
    });
  }

  registerIpc(ipcMain: IpcMain, opts: { getConfig: () => AppConfig }) {
    if (this.ipcRegistered) return;
    this.ipcRegistered = true;

    ipcMain.handle('share:open', async () => {
      const state = await this.nagStore.read();
      const fromMru = state.lastSuccessful ?? null;

      const subject =
        fromMru?.scheme && fromMru.templateLabel
          ? { scheme: fromMru.scheme, templateLabel: fromMru.templateLabel }
          : (deriveShareSubjectFromConfig(opts.getConfig()) ??
            ({ scheme: 'TEL', templateLabel: 'a configured app' } as const));

      this.currentContext = {
        mode: 'manual',
        scheme: subject.scheme,
        templateLabel: subject.templateLabel,
      };

      await this.winController.open(this.currentContext);
      return { ok: true as const };
    });

    ipcMain.handle('share:getContext', () => {
      return { context: this.currentContext };
    });

    ipcMain.handle('share:later', () => {
      this.winController.close();
      return { ok: true as const };
    });

    ipcMain.handle('share:stopNagging', async () => {
      await this.nagStore.setDisabled(true);
      this.winController.close();
      return { ok: true as const };
    });

    ipcMain.handle('share:share', async (_event, platform: unknown) => {
      if (platform !== 'x' && platform !== 'linkedin') {
        throw new Error('Invalid share platform.');
      }
      const ctx = this.currentContext;
      if (!ctx) throw new Error('Missing share context.');

      // Close interstitial before opening the browser so the share ends up on top.
      this.winController.close();

      const url = buildShareUrl({
        platform: platform as SharePlatform,
        scheme: ctx.scheme,
        templateLabel: ctx.templateLabel,
      });
      await openExternalUrl(url);
      return { ok: true as const };
    });
  }

  async onSuccessfulRoute(result: RouteUriResult): Promise<void> {
    const subject = deriveShareSubjectFromRouteResult(result);
    if (!subject) return;

    const state = await this.nagStore.read();
    const nextCount = state.successfulRouteCount + 1;

    const nextState = {
      ...state,
      successfulRouteCount: nextCount,
      lastSuccessful: {
        scheme: subject.scheme,
        templateLabel: subject.templateLabel,
      },
    };
    await this.nagStore.write(nextState);

    if (nextState.disabled) return;
    if (nextCount % NAG_INTERVAL !== 0) return;

    this.currentContext = {
      mode: 'nag',
      scheme: subject.scheme,
      templateLabel: subject.templateLabel,
    };

    // Window X is treated as Later; openNag resolves on close.
    await this.winController.openNag(this.currentContext);
  }
}
