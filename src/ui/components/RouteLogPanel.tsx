import { useCallback, useEffect, useState } from 'react';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';

interface RouteLogEntry {
  seq: number;
  when: string;
  result: unknown;
}

export function RouteLogPanel(props: { api: WinLinkRouterApi }) {
  const { api } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RouteLogEntry[]>([]);

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
              const ok = window.confirm('Clear routing log?');
              if (!ok) return;
              void api.routeLog
                .clear()
                .then(() => reload())
                .catch((err: unknown) => {
                  setError((err as Error).message);
                });
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
