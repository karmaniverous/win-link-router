import { useCallback, useEffect, useState } from 'react';

import type { RouteUriResult } from '../../core/routing/routeUri';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { ConfirmDialog } from './ConfirmDialog';

interface RouteLogEntry {
  seq: number;
  when: string;
  result: RouteUriResult;
}

export function RouteLogPanel(props: { api: WinLinkRouterApi }) {
  const { api } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RouteLogEntry[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.routeLog.get();
      setEntries(res.entries);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api.routeLog]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const lastSeq = entries.length ? entries[entries.length - 1]?.seq : null;

  return (
    <section className="panel">
      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear routing log"
        message="Clear routing log?"
        confirmLabel="Clear"
        onCancel={() => {
          setConfirmClearOpen(false);
        }}
        onConfirm={() => {
          setConfirmClearOpen(false);
          void api.routeLog
            .clear()
            .then(() => reload())
            .catch((err: unknown) => {
              setError((err as Error).message);
            });
        }}
      />
      <div className="row">
        <h2>Routing log</h2>
        <div className="rowActions">
          <button
            type="button"
            onClick={() => void reload()}
            disabled={loading}
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirmClearOpen(true);
            }}
            disabled={loading}
          >
            Clear
          </button>
        </div>
      </div>

      <p className="muted">
        Entries: {entries.length}
        {lastSeq !== null ? ` (latest seq: ${String(lastSeq)})` : ''}
      </p>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}

      {entries.length ? (
        <details>
          <summary>Show entries (redacted)</summary>
          <pre>{JSON.stringify(entries, null, 2)}</pre>
        </details>
      ) : (
        <p className="muted">No routing log entries yet.</p>
      )}
    </section>
  );
}
