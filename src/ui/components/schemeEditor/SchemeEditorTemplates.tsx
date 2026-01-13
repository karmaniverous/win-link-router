/**
 * Requirements addressed:
 * - Scheme editor provides template list CRUD: add/edit/remove, enable/disable,
 *   reorder.
 * - Template string input is a textarea (3 rows).
 */
import type {
  SchemeConfig,
  TemplateConfig,
} from '../../../core/config/appConfig';
import { newId, swap } from './schemeEditorUtils';

export function SchemeEditorTemplates(props: {
  scheme: SchemeConfig;
  readOnly: boolean;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRequestRemoveTemplate: (templateId: string) => void;
}) {
  const { scheme, readOnly, onChangeScheme, onRequestRemoveTemplate } = props;

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
    <>
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
                    onRequestRemoveTemplate(t.id);
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
              <textarea
                rows={3}
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
    </>
  );
}
