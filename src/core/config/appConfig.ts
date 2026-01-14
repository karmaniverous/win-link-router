/**
 * Requirements addressed:
 * - Config and presets are JSON and share a common SchemeConfig shape.
 * - Onboarding state is stored per user (first-run preset selection).
 * - Schemes are canonicalized (case-insensitive; stored in a canonical form).
 * - Presets and config record version information derived from app package
 *   version (captured in AppConfig/PresetsFile metadata).
 * - Scheme enablement (router behavior) is distinct from Windows registration
 *   (OS interception); registration intent is persisted per scheme.
 * - Per-user settings include:
 *   - runInBackground (tray lifecycle),
 *   - autoEnableNewSchemes and autoRegisterNewSchemes (new-scheme defaults).
 * - Per-user update settings:
 *   - autoUpdatesEnabled (startup + hourly checks when enabled; manual checks always available).
 */
export const APP_CONFIG_SCHEMA_VERSION = 1 as const;

export type RouteLogMode = 'redacted' | 'full';

export interface TemplateConfig {
  id: string;
  label: string;
  template: string;
  enabled: boolean;
}

export interface SchemeConfig {
  /**
   * Canonical scheme name (e.g. "TEL"), without trailing ":".
   */
  scheme: string;
  /**
   * Router behavior switch. If disabled, routing fails for this scheme even if
   * Windows invoked the app.
   */
  enabled: boolean;
  /**
   * Desired per-user Windows candidate registration state.
   *
   * Invariant: registered implies enabled.
   */
  registered: boolean;
  extractor: {
    pattern: string;
    flags?: string;
  };
  templates: TemplateConfig[];

  /**
   * Present only for preset entries (identifier used by "reset to preset").
   */
  presetId?: string;

  /**
   * Present only for user schemes that were initialized from a preset.
   */
  derivedFromPresetId?: string;
}

export interface AppConfig {
  schemaVersion: typeof APP_CONFIG_SCHEMA_VERSION;

  /**
   * App package version (e.g. Electron app.getVersion()) at the time this file
   * was last written. This is traceability metadata, not a compatibility gate.
   */
  appVersion?: string;

  settings: {
    /**
     * If true, keep the app running in the system tray after routing and hide
     * the window on close. If false, the app runs without tray integration.
     */
    runInBackground?: boolean;
    runAtLogin: boolean;
    sharedConfigPath?: string | null;
    /**
     * Privacy/safety control for persisted routing logs.
     * - "redacted": do not persist raw URIs/targets (default).
     * - "full": persist raw URIs/targets (more useful, less private).
     */
    routeLogMode?: RouteLogMode;
    /**
     * Default for new schemes created from the UI.
     */
    autoEnableNewSchemes?: boolean;
    /**
     * Default for new schemes created from the UI.
     *
     * Invariant: autoRegisterNewSchemes implies autoEnableNewSchemes.
     */
    autoRegisterNewSchemes?: boolean;
    /**
     * Per-user onboarding state. When false and config has no schemes, the UI
     * may offer a first-run preset selection flow.
     */
    onboardingCompleted?: boolean;
    /**
     * Auto-update toggle (default true). When enabled, the app checks at startup
     * and every hour. When disabled, scheduled checks stop but manual update
     * checks remain available via the About window.
     */
    autoUpdatesEnabled?: boolean;
  };
  schemes: SchemeConfig[];
}

export interface PresetsFile {
  schemaVersion: typeof APP_CONFIG_SCHEMA_VERSION;

  /**
   * App package version that shipped the bundled presets. This is traceability
   * metadata only.
   */
  appVersion?: string;

  presets: SchemeConfig[];
}

const SCHEME_RE = /^[A-Z][A-Z0-9+.-]*$/;

export function normalizeScheme(raw: string): string {
  const trimmed = raw.trim();
  const withoutColon = trimmed.endsWith(':') ? trimmed.slice(0, -1) : trimmed;
  const upper = withoutColon.toUpperCase();

  if (!SCHEME_RE.test(upper)) {
    throw new Error(
      `Invalid scheme "${raw}". Expected RFC3986-ish scheme characters.`,
    );
  }

  return upper;
}

function normalizeOptionalScheme(raw: string | null | undefined): string {
  if (!raw) {
    throw new Error('Missing scheme.');
  }
  return normalizeScheme(raw);
}

export function findSchemeConfig(
  config: AppConfig,
  scheme: string,
): SchemeConfig | undefined {
  const normalized = normalizeOptionalScheme(scheme);
  return config.schemes.find((s) => s.scheme === normalized);
}
