/**
 * Requirements addressed:
 * - Renderer stays UI-focused and uses preload APIs for OS/Electron side effects.
 * - UI needs config/presets/status/test + routing-failure prefill plumbing.
 * - UI can open external links (e.g., GitHub repo) via preload + IPC.
 * - About window uses preload APIs to check/install updates.
 * - Main window can be visually dimmed when other modal windows are open.
 * - Tests can construct partial/dummy WinLinkRouterApi objects without `ui`.
 */
import type { AppConfig, PresetsFile } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';

interface SchemeWindowsStatusDto {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: 'default' | 'not-default' | 'unknown';
  expectedProgId: string;
  actualProgId?: string | null;
}

interface LastRouteErrorDto {
  when: string;
  uri: string;
  result: RouteUriResult;
}

export interface ModalOverlayEvent {
  owner: string;
  active: boolean;
}

export interface WinLinkRouterApi {
  appConfig: {
    get: () => Promise<{
      config: AppConfig;
      readOnly: boolean;
      warnings: string[];
    }>;
    set: (next: unknown) => Promise<{ ok: true }>;
    exportSchemes: () => Promise<
      { cancelled: true } | { cancelled: false; filePath: string }
    >;
    importSchemes: () => Promise<
      | { cancelled: true }
      | { cancelled: false; filePath: string; importedSchemes: number }
    >;
  };
  settings: {
    set: (patch: unknown) => Promise<{ ok: true; warnings?: string[] }>;
    pickSharedConfigPath: () => Promise<
      { cancelled: true } | { cancelled: false; filePath: string }
    >;
  };
  presets: {
    get: () => Promise<PresetsFile>;
  };
  windows: {
    ensureRegistration: () => Promise<{ ok: boolean; warnings: string[] }>;
    getSchemeStatuses: () => Promise<SchemeWindowsStatusDto[]>;
    openDefaultApps: (scheme?: string) => Promise<{ ok: true }>;
    openExternal: (url: string) => Promise<{ ok: true }>;
  };
  routing: {
    getLastRouteError: () => Promise<LastRouteErrorDto | null>;
    clearLastRouteError: () => Promise<{ ok: true }>;
  };
  routeLog: {
    get: () => Promise<{
      entries: {
        seq: number;
        when: string;
        result: RouteUriResult;
      }[];
    }>;
    clear: () => Promise<{ ok: true }>;
  };
  test: {
    evaluate: (
      scheme: string,
      uri: string,
    ) => Promise<{
      matchGroups?: Record<string, string>;
      evaluations: {
        templateId: string;
        label: string;
        enabled: boolean;
        renderedTarget?: string;
        renderError?: string;
      }[];
      error?: string;
    }>;
  };
  updates: {
    getStatus: () => Promise<{
      status: {
        stage: string;
        currentVersion: string;
        autoUpdatesEnabled: boolean;
        lastCheckedAt?: string;
        availableVersion?: string;
        downloadedVersion?: string;
        progressPercent?: number;
        message?: string;
      };
    }>;
    checkNow: () => Promise<{ ok: true }>;
    updateNow: () => Promise<{ ok: true }>;
  };
  share: {
    open: () => Promise<{ ok: true }>;
    getContext: () => Promise<{
      context: {
        mode: 'manual' | 'nag';
        scheme: string;
        templateLabel: string;
      } | null;
    }>;
    later: () => Promise<{ ok: true }>;
    stopNagging: () => Promise<{ ok: true }>;
    shareX: () => Promise<{ ok: true }>;
    shareLinkedIn: () => Promise<{ ok: true }>;
  };
  ui?: {
    onModalOverlayChanged: (
      handler: (evt: ModalOverlayEvent) => void,
    ) => () => void;
  };
}

declare global {
  interface Window {
    winLinkRouter?: WinLinkRouterApi;
  }
}

export function getWinLinkRouterApi(): WinLinkRouterApi | null {
  if (typeof window === 'undefined') return null;
  return window.winLinkRouter ?? null;
}
