/**
 * Requirements addressed:
 * - Config and presets are JSON and share a common SchemeConfig shape.
 * - Schemes are canonicalized (case-insensitive; stored in a canonical form).
 * - Presets and config record version information derived from app package
 *   version (captured in AppConfig/PresetsFile metadata).
 */
export const APP_CONFIG_SCHEMA_VERSION = 1 as const;

export interface ExtractorConfig {
  pattern: string;
  flags?: string;
}

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
  enabled: boolean;
  extractor: ExtractorConfig;
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

export interface AppSettings {
  runAtLogin: boolean;
  sharedConfigPath?: string | null;
}

export interface AppConfig {
  schemaVersion: typeof APP_CONFIG_SCHEMA_VERSION;

  /**
   * App package version (e.g. Electron app.getVersion()) at the time this file
   * was last written. This is traceability metadata, not a compatibility gate.
   */
  appVersion?: string;

  settings: AppSettings;
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

export function normalizeOptionalScheme(
  raw: string | null | undefined,
): string {
  if (!raw) {
    throw new Error('Missing scheme.');
  }
  return normalizeScheme(raw);
}

export function findSchemeConfig(
  config: AppConfig,
  scheme: string,
): SchemeConfig | undefined {
  const normalized = normalizeScheme(scheme);
  return config.schemes.find((s) => s.scheme === normalized);
}
