/**
 * Requirements addressed:
 * - Renderer stays UI-focused and uses preload APIs for OS/Electron side effects.
 * - UI needs config/presets/status/test + routing-failure prefill plumbing.
 */
import type { AppConfig, PresetsFile } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';

export interface SchemeWindowsStatusDto {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: 'default' | 'not-default' | 'unknown';
  expectedProgId: string;
  actualProgId?: string | null;
}

export interface LastRouteErrorDto {
  when: string;
  uri: string;
  result: RouteUriResult;
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
    set: (patch: unknown) => Promise<{ ok: true }>;
  };
  presets: {
    get: () => Promise<PresetsFile>;
  };
  windows: {
    ensureRegistration: () => Promise<{ ok: boolean; warnings: string[] }>;
    getSchemeStatuses: () => Promise<SchemeWindowsStatusDto[]>;
    openDefaultApps: () => Promise<{ ok: true }>;
  };
  routing: {
    getLastRouteError: () => Promise<LastRouteErrorDto | null>;
    clearLastRouteError: () => Promise<{ ok: true }>;
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
