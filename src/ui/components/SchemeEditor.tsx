import { useMemo, useState } from 'react';

import type {
  PresetsFile,
  SchemeConfig,
  TemplateConfig,
} from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { ConfirmDialog } from './ConfirmDialog';

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
}

function newId(prefix: string): string {
  // Browser-safe id generation; stable enough for local config usage.
  return `${prefix}-${String(Date.now())}-${Math.random()
    .toString(16)
    .slice(2)}`;
}

function findPresetsForScheme(
  presets: PresetsFile | null,
  scheme: string,
): SchemeConfig[] {
  if (!presets) return [];
  return presets.presets.filter((p) => p.scheme === scheme);
}

function cloneFromPreset(preset: SchemeConfig): SchemeConfig {
  const { presetId, ...rest } = preset;
  return {
    ...rest,
    presetId: undefined,
    derivedFromPresetId: presetId ?? undefined,
  };
}

function getExtractorError(
  extractor: SchemeConfig['extractor'],
): string | null {
  const pattern = extractor.pattern;
  const flags = extractor.flags ?? '';

  if (!pattern.trim()) return 'Extractor pattern is required.';

  // Global matching is stateful across calls; we forbid it for determinism.
  if (flags.includes('g')) {
    return 'Extractor flags must not include "g".';
  }

  try {
    RegExp(pattern, flags);
    return null;
  } catch (err) {
    return `Extractor regex is invalid: ${(err as Error).message}`;
  }
}

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

  const extractorError = getExtractorError(scheme.extractor);
  const updateTemplate = (id: string, patch: Partial<TemplateConfig>) => {
    const templates = scheme.templates.map((t) =>
      t.id === id ? { ...t, ...patch } : t,
    );
    onChangeScheme({ ...scheme, templates });
  };

  const addTemplate = () => {
    const next: TemplateConfig = {
      id: newId('tpl'),
      label: 'New template',
      template: '',
      enabled: true,
    };
    onChangeScheme({ ...scheme, templates: [...scheme.templates, next] });
  };

  return (
    <section className="panel">
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

      <label className="field">
        <span>Enabled</span>
        <input
          type="checkbox"
          checked={scheme.enabled}
          disabled={readOnly}
          onChange={(e) => {
            onChangeScheme(
              { ...scheme, enabled: e.target.checked },
              { ensureRegistration: true },
            );
          }}
        />
      </label>

      <h3>Extractor</h3>
      <label className="field">
        <span>Pattern</span>
        <input
          value={scheme.extractor.pattern}
          disabled={readOnly}
          onChange={(e) => {
            onChangeScheme({
              ...scheme,
              extractor: { ...scheme.extractor, pattern: e.target.value },
            });
          }}
        />
      </label>
      <label className="field">
        <span>Flags</span>
        <input
          value={scheme.extractor.flags ?? ''}
          disabled={readOnly}
          onChange={(e) => {
            onChangeScheme({
              ...scheme,
              extractor: { ...scheme.extractor, flags: e.target.value },
            });
          }}
        />
      </label>
      {extractorError ? <p className="error">{extractorError}</p> : null}

      <h3>Templates</h3>
      <div className="row">
        <p className="muted">
          Order matters; the app tries the first enabled template that opens
          successfully.
        </p>
        <div className="rowActions">
          <button type="button" disabled={readOnly} onClick={addTemplate}>
            Add template
          </button>
        </div>
      </div>

      {scheme.templates.length === 0 ? (
        <p className="muted">
          No templates yet. Add at least one enabled template to route links.
        </p>
      ) : null}

      <div className="stack">
        {scheme.templates.map((t, idx) => (
          <div key={t.id} className="card">
            <div className="row">
              <strong>{t.label || '(untitled)'}</strong>
              <div className="rowActions">
                <button
                  type="button"
                  disabled={readOnly || idx === 0}
                  onClick={() => {
                    onChangeScheme({
                      ...scheme,
                      templates: swap(scheme.templates, idx, idx - 1),
                    });
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  disabled={readOnly || idx === scheme.templates.length - 1}
                  onClick={() => {
                    onChangeScheme({
                      ...scheme,
                      templates: swap(scheme.templates, idx, idx + 1),
                    });
                  }}
                >
                  ↓
                </button>
                <button
                  type="button"
                  disabled={readOnly}
                  onClick={() => {
                    setRemoveTemplateId(t.id);
                  }}
                >
                  Remove
                </button>
              </div>
            </div>

            <label className="field">
              <span>Enabled</span>
              <input
                type="checkbox"
                checked={t.enabled}
                disabled={readOnly}
                onChange={(e) => {
                  updateTemplate(t.id, { enabled: e.target.checked });
                }}
              />
            </label>

            <label className="field">
              <span>Label</span>
              <input
                value={t.label}
                disabled={readOnly}
                onChange={(e) => {
                  updateTemplate(t.id, { label: e.target.value });
                }}
              />
            </label>

            <label className="field">
              <span>Template</span>
              <input
                value={t.template}
                disabled={readOnly}
                onChange={(e) => {
                  updateTemplate(t.id, { template: e.target.value });
                }}
              />
            </label>

            {!t.template.trim() ? (
              <p className="warning">Template is empty and will not save.</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
