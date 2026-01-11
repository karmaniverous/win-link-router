/**
 * Requirements addressed:
 * - Ship built-in presets bundled with the app, stored as JSON and read-only.
 * - Presets are validated on load.
 * - Presets carry traceability metadata derived from the app package version.
 */
import type { PresetsFile } from '../../core/config/appConfig';
import { parsePresetsFile } from '../../core/config/appConfig.schema';
// Bundled via Vite into the main process build.
import presetsJson from '../../presets/presets.json';

export function loadBundledPresets(appVersion?: string): PresetsFile {
  const parsed = parsePresetsFile(presetsJson);
  return {
    ...parsed,
    appVersion: appVersion ?? parsed.appVersion,
  };
}
