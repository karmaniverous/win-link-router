/**
 * Requirements addressed:
 * - New schemes should respect per-user defaults for enable/register.
 * - Enforce registered ⇒ enabled when creating new schemes.
 */
import {
  Alert,
  Button,
  NativeSelect,
  Stack,
  Text,
  TextInput,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';

import type { PresetsFile, SchemeConfig } from '../../core/config/appConfig';
import { normalizeScheme } from '../../core/config/appConfig';
import { Modal } from './Modal';

/**
 * Requirements addressed:
 * - Users must be able to add a scheme without relying on window.prompt().
 * - If presets exist for a scheme, allow selecting which preset to use.
 * - Prefer Mantine primitives for inputs and dialog actions.
 */
function applyNewSchemeDefaults(
  scheme: SchemeConfig,
  defaults: { enabled: boolean; registered: boolean },
): SchemeConfig {
  const enabled = defaults.registered ? true : defaults.enabled;
  return { ...scheme, enabled, registered: defaults.registered };
}

function createBlankScheme(scheme: string): SchemeConfig {
  return {
    scheme,
    enabled: true,
    registered: true,
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
  defaults?: { enabled: boolean; registered: boolean };
  onCancel: () => void;
  onAdd: (scheme: SchemeConfig) => void;
}) {
  const { open, presets, existingSchemes, onCancel, onAdd } = props;
  const defaults = props.defaults ?? { enabled: true, registered: true };

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

  const nativeSelectData = useMemo(() => {
    const out: { value: string; label: string }[] = [
      { value: 'blank', label: 'Blank (no preset)' },
    ];
    for (const o of presetOptions) {
      if (o.kind === 'preset') out.push({ value: o.key, label: o.label });
    }
    return out;
  }, [presetOptions]);

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
        ? applyNewSchemeDefaults(createBlankScheme(normalized), defaults)
        : applyNewSchemeDefaults(
            { ...cloneFromPreset(option.preset), scheme: normalized },
            defaults,
          );

    onAdd(next);
  };

  return (
    <Modal
      open={open}
      title="Add scheme"
      onClose={onCancel}
      footer={
        <>
          <Button variant="default" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={submit} disabled={!canSubmit}>
            Add
          </Button>
        </>
      }
    >
      <Stack gap="sm">
        <TextInput
          label="Scheme"
          value={raw}
          onChange={(e) => {
            setRaw(e.currentTarget.value);
            setError(null);
          }}
          placeholder="e.g. TEL, MAILTO"
          aria-label="Scheme"
        />

        {normalized ? (
          <Text size="sm" c="dimmed">
            Normalized:{' '}
            <Text span fw={600}>
              {normalized}
            </Text>
          </Text>
        ) : null}

        {normalizedError ? (
          <Alert color="red" title="Invalid scheme">
            {normalizedError}
          </Alert>
        ) : null}
        {duplicateError ? (
          <Alert color="red" title="Duplicate scheme">
            {duplicateError}
          </Alert>
        ) : null}
        {error ? (
          <Alert color="red" title="Error">
            {error}
          </Alert>
        ) : null}

        {normalized && presets ? (
          <Text size="sm" c="dimmed">
            Presets found for {normalized}: {presetCount}
          </Text>
        ) : null}

        <NativeSelect
          label="Initialize from"
          value={selectedOptionKey}
          onChange={(e) => {
            setSelectedOptionKey(e.currentTarget.value);
            setSelectionTouched(true);
            setError(null);
          }}
          disabled={!normalized}
          aria-label="Initialize from"
          data={nativeSelectData}
        />
      </Stack>
    </Modal>
  );
}
