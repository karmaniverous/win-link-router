import { useMemo, useState } from 'react';

import type { PresetsFile, SchemeConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { ConfirmDialog } from './ConfirmDialog';
import {
  cloneFromPreset,
  findPresetsForScheme,
} from './schemeEditor/presetUtils';
import { SchemeEditorExtractor } from './schemeEditor/SchemeEditorExtractor';
import { SchemeEditorTemplates } from './schemeEditor/SchemeEditorTemplates';

export function SchemeEditor(props: {
  api: WinLinkRouterApi;
  scheme: SchemeConfig | null;
  presets: PresetsFile | null;
  readOnly: boolean;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRemoveScheme: (scheme: string) => void;
}) {
  const { api, scheme, presets, readOnly, onChangeScheme, onRemoveScheme } =
    props;

  if (!scheme) {
    return (
      <section className="panel">
        <h2>Scheme</h2>
        <p className="muted">Select a scheme to edit.</p>
      </section>
    );
  }

  const schemePresets = findPresetsForScheme(presets, scheme.scheme);
  const defaultPreset = schemePresets.length
    ? (schemePresets.find(
        (p) =>
          p.presetId !== undefined && p.presetId === scheme.derivedFromPresetId,
      ) ?? schemePresets[0])
    : null;

  const presetOptions = useMemo(() => {
    return schemePresets.map((p, idx) => ({
      key: p.presetId ?? `preset-${String(idx)}`,
      label: p.presetId ?? `Preset ${String(idx + 1)}`,
      preset: p,
    }));
  }, [schemePresets]);

  const [removeSchemeOpen, setRemoveSchemeOpen] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPresetKey, setResetPresetKey] = useState<string>('blank');

  const templateToRemove =
    removeTemplateId !== null
      ? (scheme.templates.find((t) => t.id === removeTemplateId) ?? null)
      : null;

  return (
    <section className="panel schemeEditor">
      <ConfirmDialog
        open={removeSchemeOpen}
        title="Remove scheme"
        message={`Remove scheme ${scheme.scheme}?`}
        confirmLabel="Remove"
        onCancel={() => {
          setRemoveSchemeOpen(false);
        }}
        onConfirm={() => {
          setRemoveSchemeOpen(false);
          onRemoveScheme(scheme.scheme);
        }}
      />

      <ConfirmDialog
        open={removeTemplateId !== null}
        title="Remove template"
        message={`Remove template "${templateToRemove?.label ?? '(untitled)'}"?`}
        confirmLabel="Remove"
        onCancel={() => {
          setRemoveTemplateId(null);
        }}
        onConfirm={() => {
          const id = removeTemplateId;
          setRemoveTemplateId(null);
          if (!id) return;
          onChangeScheme({
            ...scheme,
            templates: scheme.templates.filter((x) => x.id !== id),
          });
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reset to preset"
        message={`Reset ${scheme.scheme} to preset? This will overwrite extractor and templates.`}
        confirmLabel="Reset"
        onCancel={() => {
          setResetOpen(false);
        }}
        confirmDisabled={!presetOptions.length}
        onConfirm={() => {
          const chosen =
            presetOptions.find((p) => p.key === resetPresetKey)?.preset ?? null;
          if (!chosen) return;
          const reset = cloneFromPreset(chosen);
          setResetOpen(false);
          onChangeScheme(
            {
              ...reset,
              scheme: scheme.scheme,
              enabled: scheme.enabled,
            },
            { ensureRegistration: true },
          );
        }}
      >
        {presetOptions.length > 1 ? (
          <label className="field">
            <span>Preset</span>
            <select
              value={resetPresetKey}
              onChange={(e) => {
                setResetPresetKey(e.target.value);
              }}
              aria-label="Preset"
            >
              {presetOptions.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </ConfirmDialog>

      <div className="schemeEditorScroll">
        <div className="row">
          <h2>{scheme.scheme}</h2>
          <div className="rowActions">
            <button
              type="button"
              onClick={() => void api.windows.openDefaultApps(scheme.scheme)}
            >
              Set default…
            </button>
            {defaultPreset ? (
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  const preferredKey =
                    presetOptions.find(
                      (p) =>
                        p.preset.presetId !== undefined &&
                        p.preset.presetId === scheme.derivedFromPresetId,
                    )?.key ?? presetOptions[0]?.key;
                  if (preferredKey) setResetPresetKey(preferredKey);
                  setResetOpen(true);
                }}
              >
                Reset to preset
              </button>
            ) : null}
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                setRemoveSchemeOpen(true);
              }}
            >
              Remove
            </button>
          </div>
        </div>

        <SchemeEditorExtractor
          scheme={scheme}
          readOnly={readOnly}
          onChangeScheme={onChangeScheme}
        />

        <SchemeEditorTemplates
          scheme={scheme}
          readOnly={readOnly}
          onChangeScheme={onChangeScheme}
          onRequestRemoveTemplate={(templateId) => {
            setRemoveTemplateId(templateId);
          }}
        />
      </div>
    </section>
  );
}
