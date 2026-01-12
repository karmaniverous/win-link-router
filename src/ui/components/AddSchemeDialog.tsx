import { useEffect, useMemo, useState } from 'react';

import type { PresetsFile, SchemeConfig } from '../../core/config/appConfig';
import { normalizeScheme } from '../../core/config/appConfig';
import { Modal } from './Modal';

/**
 * Requirements addressed:
 * - Users must be able to add a scheme without relying on window.prompt().
 * - If presets exist for a scheme, allow selecting which preset to use.
 */
function createBlankScheme(scheme: string): SchemeConfig {
  return {
    scheme,
    enabled: true,
    extractor: { pattern: '^(?<value>.*)$', flags: '' },
    templates: [],
  };
}

function cloneFromPreset(preset: SchemeConfig): SchemeConfig {
  const { presetId, ...rest } = preset;
  return {
    ...rest,
    presetId: undefined,
    derivedFromPresetId: presetId ?? undefined,
  };
}

function getPresetsForScheme(presets: PresetsFile | null, scheme: string) {
  if (!presets) return [];
  return presets.presets.filter((p) => p.scheme === scheme);
}

type PresetOption =
  | { kind: 'blank'; label: string }
  | { kind: 'preset'; key: string; label: string; preset: SchemeConfig };

export function AddSchemeDialog(props: {
  open: boolean;
  presets: PresetsFile | null;
  existingSchemes: string[];
  onCancel: () => void;
  onAdd: (scheme: SchemeConfig) => void;
}) {
  const { open, presets, existingSchemes, onCancel, onAdd } = props;

  const [raw, setRaw] = useState('');
  const [selectedOptionKey, setSelectedOptionKey] = useState<string>('blank');
  const [selectionTouched, setSelectionTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setRaw('');
    setSelectedOptionKey('blank');
    setSelectionTouched(false);
    setError(null);
  }, [open]);

  const normalized = useMemo(() => {
    try {
      if (!raw.trim()) return null;
      return normalizeScheme(raw);
    } catch (_err) {
      return null;
    }
  }, [raw]);

  const normalizedError = useMemo(() => {
    try {
      if (!raw.trim()) return null;
      normalizeScheme(raw);
      return null;
    } catch (_err) {
      return (_err as Error).message;
    }
  }, [raw]);

  const duplicateError = useMemo(() => {
    if (!normalized) return null;
    return existingSchemes.includes(normalized)
      ? `Scheme ${normalized} already exists.`
      : null;
  }, [existingSchemes, normalized]);

  const presetOptions = useMemo<PresetOption[]>(() => {
    if (!normalized) return [{ kind: 'blank', label: 'Blank (no preset)' }];

    const list = getPresetsForScheme(presets, normalized);
    const out: PresetOption[] = [{ kind: 'blank', label: 'Blank (no preset)' }];

    for (let i = 0; i < list.length; i++) {
      const preset = list[i];
      const key = preset.presetId ?? `preset-${String(i)}`;
      const label = preset.presetId ? `Preset: ${preset.presetId}` : 'Preset';
      out.push({ kind: 'preset', key, label, preset });
    }

    return out;
  }, [normalized, presets]);

  const presetCount = useMemo(() => {
    if (!normalized) return 0;
    if (!presets) return 0;
    return getPresetsForScheme(presets, normalized).length;
  }, [normalized, presets]);

  useEffect(() => {
    if (!open) return;
    if (!normalized) return;
    if (!presets) return;
    if (selectionTouched) return;

    const preset = presetOptions.find((o) => o.kind === 'preset');
    const presetOnly = presetOptions.filter((o) => o.kind === 'preset').length;
    if (presetOnly === 1 && preset?.kind === 'preset') {
      setSelectedOptionKey(preset.key);
    } else {
      setSelectedOptionKey('blank');
    }
  }, [normalized, open, presetOptions, presets, selectionTouched]);

  const canSubmit =
    open &&
    normalized !== null &&
    normalizedError === null &&
    duplicateError === null &&
    presetOptions.some((o) =>
      o.kind === 'blank'
        ? selectedOptionKey === 'blank'
        : o.key === selectedOptionKey,
    );

  const submit = () => {
    if (!normalized) return;
    if (normalizedError) return;
    if (duplicateError) return;

    const option =
      selectedOptionKey === 'blank'
        ? presetOptions.find((o) => o.kind === 'blank')
        : presetOptions.find(
            (o) => o.kind === 'preset' && o.key === selectedOptionKey,
          );

    if (!option) {
      setError('Invalid preset selection.');
      return;
    }

    const next =
      option.kind === 'blank'
        ? createBlankScheme(normalized)
        : {
            ...cloneFromPreset(option.preset),
            scheme: normalized,
            enabled: true,
          };

    onAdd(next);
  };

  return (
    <Modal
      open={open}
      title="Add scheme"
      onClose={onCancel}
      footer={
        <>
          <button type="button" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={submit} disabled={!canSubmit}>
            Add
          </button>
        </>
      }
    >
      <label className="field">
        <span>Scheme</span>
        <input
          value={raw}
          onChange={(e) => {
            setRaw(e.target.value);
            setError(null);
          }}
          placeholder="e.g. TEL, MAILTO"
          aria-label="Scheme"
        />
      </label>

      {normalized ? (
        <p className="muted">
          Normalized: <strong>{normalized}</strong>
        </p>
      ) : null}

      {normalizedError ? <p className="error">{normalizedError}</p> : null}
      {duplicateError ? <p className="error">{duplicateError}</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {normalized && presets ? (
        <p className="muted">
          Presets found for {normalized}: {presetCount}
        </p>
      ) : null}

      <label className="field">
        <span>Initialize from</span>
        <select
          value={selectedOptionKey}
          onChange={(e) => {
            setSelectedOptionKey(e.target.value);
            setSelectionTouched(true);
            setError(null);
          }}
          disabled={!normalized}
          aria-label="Initialize from"
        >
          <option value="blank">Blank (no preset)</option>
          {presetOptions
            .filter(
              (o): o is Extract<PresetOption, { kind: 'preset' }> =>
                o.kind === 'preset',
            )
            .map((o) => (
              <option key={o.key} value={o.key}>
                {o.label}
              </option>
            ))}
        </select>
      </label>
    </Modal>
  );
}
