/**
 * Requirements addressed:
 * - Auto-updates via update.electronjs.org (packaged Windows only).
 * - Check at startup and every hour when enabled; stop scheduling when disabled.
 * - Manual checks remain available when disabled (About window).
 * - Install-on-quit default; "Update Now" downloads (if needed) then installs.
 * - Keep side effects behind a small runtime; expose status and actions via IPC.
 * - Coalesce update checks to avoid "already in progress" collisions and do not
 *   surface those collisions as user-visible errors.
 * - Status must reflect in-flight work immediately (optimistic checking stage).
 */
import type { IpcMain } from 'electron';
import { autoUpdater } from 'electron';

import { UPDATE_REPO_SLUG } from '../../core/app/branding';
import type { AppConfig } from '../../core/config/appConfig';
import { buildUpdateElectronjsOrgFeedUrl } from './updateFeedUrl';
import type { UpdateStatus } from './updateTypes';

const ONE_HOUR_MS = 60 * 60 * 1000;

function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}

function isAlreadyInProgressError(err: unknown): boolean {
  const msg = toErrorMessage(err).toLowerCase();
  // Electron/autoUpdater error strings vary; treat any "in progress" collision
  // as a benign no-op so UI continues to reflect actual update state.
  return (
    msg.includes('in progress') &&
    (msg.includes('update') || msg.includes('check'))
  );
}

function extractVersionLike(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value !== 'object' || value === null) return undefined;
  const rec = value as Record<string, unknown>;
  const v = rec.version;
  if (typeof v === 'string' && v.trim()) return v.trim();
  return undefined;
}

export class UpdateRuntime {
  private ipcRegistered = false;
  private feedConfigured = false;
  private interval: NodeJS.Timeout | null = null;
  private updateNowRequested = false;
  private checkInFlight = false;

  private status: UpdateStatus;

  constructor(
    private opts: {
      isPackaged: boolean;
      getCurrentVersion: () => string;
      repo?: string;
      platform?: NodeJS.Platform;
      arch?: string;
    },
  ) {
    const currentVersion = opts.getCurrentVersion();
    this.status = {
      stage: 'idle',
      currentVersion,
      autoUpdatesEnabled: true,
    };
  }

  applySettings(settings: AppConfig['settings']): void {
    const enabled = settings.autoUpdatesEnabled ?? true;
    this.status.autoUpdatesEnabled = enabled;
    this.refreshSchedule();
  }

  getStatus(): UpdateStatus {
    // Ensure current version stays accurate.
    this.status.currentVersion = this.opts.getCurrentVersion();
    return { ...this.status };
  }

  registerIpc(ipcMain: IpcMain): void {
    if (this.ipcRegistered) return;
    this.ipcRegistered = true;

    ipcMain.handle('updates:getStatus', () => {
      return { status: this.getStatus() };
    });

    ipcMain.handle('updates:checkNow', () => {
      this.checkNow('manual');
      return { ok: true as const };
    });

    ipcMain.handle('updates:updateNow', () => {
      this.updateNow();
      return { ok: true as const };
    });
  }

  start(): void {
    this.configureFeedIfNeeded();
    this.attachListenersOnce();

    // Best-effort startup check only when auto-updates are enabled.
    if (this.status.autoUpdatesEnabled) {
      this.checkNow('startup');
    }

    this.refreshSchedule();
  }

  private canUseAutoUpdater(): { ok: boolean; reason?: string } {
    const platform = this.opts.platform ?? process.platform;
    if (platform !== 'win32')
      return { ok: false, reason: 'Updates are Windows-only.' };
    if (!this.opts.isPackaged) {
      return { ok: false, reason: 'Updates are disabled while not packaged.' };
    }
    return { ok: true };
  }

  private configureFeedIfNeeded(): void {
    if (this.feedConfigured) return;

    const can = this.canUseAutoUpdater();
    if (!can.ok) {
      this.status.stage = 'disabled';
      this.status.message = can.reason;
      return;
    }

    const repo = this.opts.repo ?? UPDATE_REPO_SLUG;
    const platform = this.opts.platform ?? process.platform;
    const arch = this.opts.arch ?? process.arch;
    const currentVersion = this.opts.getCurrentVersion();

    const url = buildUpdateElectronjsOrgFeedUrl({
      repo,
      platform,
      arch,
      currentVersion,
    });

    // Electron requires setFeedURL before checkForUpdates().
    autoUpdater.setFeedURL({ url });
    this.feedConfigured = true;
  }

  private listenersAttached = false;
  private attachListenersOnce(): void {
    if (this.listenersAttached) return;
    this.listenersAttached = true;

    // Electron's autoUpdater type definitions can be platform-conditional and
    // have narrow overloads. Use the EventEmitter view for event wiring.
    const emitter = autoUpdater as unknown as NodeJS.EventEmitter;

    emitter.on('checking-for-update', () => {
      this.status.stage = 'checking';
      this.status.message = undefined;
      this.checkInFlight = true;
    });

    emitter.on('update-available', (info: unknown) => {
      this.status.stage = 'available';
      this.status.availableVersion = extractVersionLike(info);
      this.status.message = undefined;
    });

    emitter.on('update-not-available', () => {
      this.status.stage = 'upToDate';
      this.status.availableVersion = undefined;
      this.status.downloadedVersion = undefined;
      this.status.progressPercent = undefined;
      this.status.message = undefined;
      this.status.lastCheckedAt = new Date().toISOString();
      this.updateNowRequested = false;
      this.checkInFlight = false;
    });

    emitter.on('download-progress', (progressObj: unknown) => {
      const percent =
        typeof progressObj === 'object' && progressObj !== null
          ? (progressObj as Record<string, unknown>).percent
          : undefined;
      if (typeof percent === 'number' && Number.isFinite(percent)) {
        this.status.stage = 'downloading';
        this.status.progressPercent = Math.max(0, Math.min(100, percent));
      } else {
        this.status.stage = 'downloading';
      }
    });

    emitter.on(
      'update-downloaded',
      (event: unknown, releaseNotes: unknown, releaseName: unknown) => {
        void event;
        void releaseNotes;
        const downloaded =
          extractVersionLike(releaseName) ?? this.status.availableVersion;
        this.status.stage = 'downloaded';
        this.status.downloadedVersion = downloaded;
        this.status.lastCheckedAt = new Date().toISOString();
        this.checkInFlight = false;

        if (this.updateNowRequested) {
          this.updateNowRequested = false;
          try {
            autoUpdater.quitAndInstall();
          } catch (err) {
            this.status.stage = 'error';
            this.status.message = `Failed to install update: ${toErrorMessage(err)}`;
          }
        }
      },
    );

    emitter.on('error', (err: unknown) => {
      if (isAlreadyInProgressError(err)) {
        // Benign collision; keep current stage and let the in-flight events win.
        this.checkInFlight = true;
        return;
      }
      this.status.stage = 'error';
      this.status.message = toErrorMessage(err);
      this.status.lastCheckedAt = new Date().toISOString();
      this.updateNowRequested = false;
      this.checkInFlight = false;
    });
  }

  private refreshSchedule(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }

    if (!this.status.autoUpdatesEnabled) return;

    const can = this.canUseAutoUpdater();
    if (!can.ok) return;

    this.interval = setInterval(() => {
      this.checkNow('scheduled');
    }, ONE_HOUR_MS);
  }

  private checkNow(_source: 'startup' | 'scheduled' | 'manual'): void {
    this.configureFeedIfNeeded();
    const can = this.canUseAutoUpdater();
    if (!can.ok) {
      this.status.stage = 'disabled';
      this.status.message = can.reason;
      return;
    }

    // Coalesce repeated check requests.
    if (this.checkInFlight) return;
    if (this.status.stage === 'checking') return;
    if (this.status.stage === 'downloading') return;
    if (this.status.stage === 'available') return;
    if (this.status.stage === 'downloaded') return;

    // Optimistically reflect the in-flight check immediately so UI opened
    // during startup sees the correct state without waiting for events.
    this.status.stage = 'checking';
    this.status.message = undefined;
    this.checkInFlight = true;

    try {
      autoUpdater.checkForUpdates();
    } catch (err) {
      if (isAlreadyInProgressError(err)) {
        // Treat as a benign no-op; updater is already doing work.
        this.checkInFlight = true;
        return;
      }
      this.status.stage = 'error';
      this.status.message = toErrorMessage(err);
      this.status.lastCheckedAt = new Date().toISOString();
      this.updateNowRequested = false;
      this.checkInFlight = false;
    }
  }

  private updateNow(): void {
    this.configureFeedIfNeeded();
    const can = this.canUseAutoUpdater();
    if (!can.ok) {
      this.status.stage = 'disabled';
      this.status.message = can.reason;
      return;
    }

    if (this.status.stage === 'downloaded') {
      try {
        autoUpdater.quitAndInstall();
      } catch (err) {
        this.status.stage = 'error';
        this.status.message = `Failed to install update: ${toErrorMessage(err)}`;
      }
      return;
    }

    // If an update is already in progress, do not attempt another check.
    if (
      this.status.stage === 'downloading' ||
      this.status.stage === 'available'
    ) {
      this.updateNowRequested = true;
      this.status.message = 'Updating now…';
      return;
    }

    if (this.status.stage === 'checking') {
      // About UI disables Update Now during checking; treat as a no-op here too.
      return;
    }

    // Download (if needed) and install when downloaded.
    this.updateNowRequested = true;
    this.status.message = 'Updating now…';
    this.checkNow('manual');
  }
}
