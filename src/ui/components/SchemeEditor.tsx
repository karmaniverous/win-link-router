import type {
  PresetsFile,
  SchemeConfig,
  TemplateConfig,
} from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';

function swap<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  const tmp = next[i];
  next[i] = next[j];
  next[j] = tmp;
  return next;
}

function newId(prefix: string): string {
  // Browser-safe id generation; stable enough for local config usage.
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function findPresetForScheme(
  presets: PresetsFile | null,
  scheme: string,
): SchemeConfig | null {
  if (!presets) return null;
  const match = presets.presets.find((p) => p.scheme === scheme);
  return match ?? null;
}

function cloneFromPreset(preset: SchemeConfig): SchemeConfig {
  const { presetId, ...rest } = preset;
  return {
    ...rest,
    presetId: undefined,
    derivedFromPresetId: presetId ?? undefined,
  };
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

  const preset = findPresetForScheme(presets, scheme.scheme);

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
      <div className="row">
        <h2>{scheme.scheme}</h2>
        <div className="rowActions">
          <button
            type="button"
            onClick={() => void api.windows.openDefaultApps()}
          >
            Set default…
          </button>
          {preset ? (
            <button
              type="button"
              disabled={readOnly}
              onClick={() => {
                if (!preset) return;
                const ok = window.confirm(
                  `Reset ${scheme.scheme} to preset? This will overwrite extractor and templates.`,
                );
                if (!ok) return;
                const reset = cloneFromPreset(preset);
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
              Reset to preset
            </button>
          ) : null}
          <button
            type="button"
            disabled={readOnly}
            onClick={() => {
              const ok = window.confirm(`Remove scheme ${scheme.scheme}?`);
              if (!ok) return;
              onRemoveScheme(scheme.scheme);
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
      {scheme.extractor.flags?.includes('g') ? (
        <p className="error">Extractor flags must not include "g".</p>
      ) : null}

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
        <p className="muted">No templates yet.</p>
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
                    const ok = window.confirm(`Remove template "${t.label}"?`);
                    if (!ok) return;
                    onChangeScheme({
                      ...scheme,
                      templates: scheme.templates.filter((x) => x.id !== t.id),
                    });
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
