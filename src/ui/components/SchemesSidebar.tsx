import { useMemo, useState } from 'react';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../../core/config/appConfig';
import { AddSchemeDialog } from './AddSchemeDialog';
import { formatSchemeStatusLabel } from './formatSchemeStatusLabel';
import { Spinner } from './Spinner';

/**
 * Requirements addressed:
 * - Main view shows a list of configured schemes.
 * - Users can add schemes without using window.prompt().
 * - Disable actions and show a loading indicator while config/presets load.
 */
export function SchemesSidebar(props: {
  loading: boolean;
  readOnly: boolean;
  config: AppConfig | null;
  presets: PresetsFile | null;
  statuses: {
    scheme: string;
    enabled: boolean;
    registered: boolean;
    defaultStatus: 'default' | 'not-default' | 'unknown';
    expectedProgId: string;
    actualProgId?: string | null;
  }[];
  selectedScheme: string | null;
  onSelectScheme: (scheme: string) => void;
  onAddScheme: (scheme: SchemeConfig) => void;
  onError: (message: string) => void;
}) {
  const {
    loading,
    readOnly,
    config,
    presets,
    statuses,
    selectedScheme,
    onSelectScheme,
    onAddScheme,
    onError,
  } = props;

  const [addOpen, setAddOpen] = useState(false);

  const statusByScheme = useMemo(() => {
    const map = new Map<string, (typeof statuses)[number]>();
    for (const s of statuses) map.set(s.scheme.toUpperCase(), s);
    return map;
  }, [statuses]);

  const selectedStatus = useMemo(() => {
    if (!selectedScheme) return null;
    return statusByScheme.get(selectedScheme.toUpperCase()) ?? null;
  }, [selectedScheme, statusByScheme]);

  const existingSchemes = useMemo(() => {
    return (config?.schemes ?? []).map((s) => s.scheme);
  }, [config]);

  const canAdd = !readOnly && !loading && Boolean(config) && Boolean(presets);
  const showLoading = loading || !config || !presets;

  return (
    <aside className="sidebar">
      <div className="row">
        <h2>Schemes</h2>
        <div className="rowActions">
          <button
            type="button"
            aria-label="Add scheme"
            disabled={!canAdd}
            onClick={() => {
              setAddOpen(true);
            }}
          >
            +
          </button>
        </div>
      </div>

      <AddSchemeDialog
        open={addOpen}
        presets={presets}
        existingSchemes={existingSchemes}
        onCancel={() => {
          setAddOpen(false);
        }}
        onAdd={(scheme: SchemeConfig) => {
          if (config?.schemes.some((s) => s.scheme === scheme.scheme)) {
            onError(`Scheme ${scheme.scheme} already exists.`);
            return;
          }
          onAddScheme(scheme);
          setAddOpen(false);
        }}
      />

      {showLoading ? <Spinner label="Loading schemes…" /> : null}

      {config ? (
        <ul className="list">
          {config.schemes.map((s) => {
            const status = statusByScheme.get(s.scheme) ?? null;
            const label = formatSchemeStatusLabel({
              scheme: s.scheme,
              enabled: s.enabled,
              status,
            });
            return (
              <li key={s.scheme}>
                <button
                  type="button"
                  className={selectedScheme === s.scheme ? 'selected' : ''}
                  onClick={() => {
                    onSelectScheme(s.scheme);
                  }}
                >
                  {label}
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}

      {!config?.schemes.length ? (
        <p className="muted">No schemes configured yet.</p>
      ) : null}

      {selectedStatus ? (
        <details>
          <summary>Windows status details</summary>
          <div className="stack">
            <div className="card">
              <div className="cardRow">
                <strong>{selectedStatus.scheme}</strong>
                <span className="muted">{selectedStatus.defaultStatus}</span>
              </div>
              <div className="muted">
                Expected ProgId: <code>{selectedStatus.expectedProgId}</code>
              </div>
              <div className="muted">
                Actual ProgId:{' '}
                <code>{selectedStatus.actualProgId ?? '(null)'}</code>
              </div>
            </div>
          </div>
        </details>
      ) : null}
    </aside>
  );
}
