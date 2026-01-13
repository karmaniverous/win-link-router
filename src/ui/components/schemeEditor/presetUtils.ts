/**
 * Requirements addressed:
 * - UI supports adding/resetting schemes based on bundled presets.
 */
import type { PresetsFile, SchemeConfig } from '../../../core/config/appConfig';

export function findPresetsForScheme(
  presets: PresetsFile | null,
  scheme: string,
): SchemeConfig[] {
  if (!presets) return [];
  return presets.presets.filter((p) => p.scheme === scheme);
}

export function cloneFromPreset(preset: SchemeConfig): SchemeConfig {
  const { presetId, ...rest } = preset;
  return {
    ...rest,
    presetId: undefined,
    derivedFromPresetId: presetId ?? undefined,
  };
}
