import { useEffect, useMemo, useState } from 'react';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function TestPanel(props: {
  api: WinLinkRouterApi;
  scheme: string | null;
  testUri: string;
  onChangeTestUri: (next: string) => void;
}) {
  const { api, scheme, testUri, onChangeTestUri } = props;

  const debouncedUri = useDebouncedValue(testUri, 300);
  const debouncedScheme = useDebouncedValue(scheme, 300);

  const [result, setResult] = useState<{
    matchGroups?: Record<string, string>;
    evaluations: {
      templateId: string;
      label: string;
      enabled: boolean;
      renderedTarget?: string;
      renderError?: string;
    }[];
    error?: string;
  } | null>(null);

  const canRun = useMemo(() => {
    return Boolean(debouncedScheme && debouncedUri.trim().length > 0);
  }, [debouncedScheme, debouncedUri]);

  useEffect(() => {
    if (!canRun || !debouncedScheme) {
      setResult(null);
      return;
    }

    let cancelled = false;
    void api.test
      .evaluate(debouncedScheme, debouncedUri)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ evaluations: [], error: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [api, canRun, debouncedScheme, debouncedUri]);

  return (
    <section className="panel">
      <h2>Test</h2>
      <label className="field">
        <span>Incoming URI</span>
        <input
          value={testUri}
          onChange={(e) => {
            onChangeTestUri(e.target.value);
          }}
          placeholder="e.g. tel:+1 (555) 123-4567"
        />
      </label>

      {!scheme ? <p className="muted">Select a scheme to run tests.</p> : null}

      {result?.error ? <p className="error">{result.error}</p> : null}

      {result?.matchGroups ? (
        <details>
          <summary>Match groups</summary>
          <pre>{JSON.stringify(result.matchGroups, null, 2)}</pre>
        </details>
      ) : null}

      {result?.evaluations.length ? (
        <div className="stack">
          {result.evaluations.map((e) => (
            <div key={e.templateId} className="card">
              <div className="cardRow">
                <strong>{e.label}</strong>
                <span className="muted">
                  {e.enabled ? 'enabled' : 'disabled'}
                </span>
              </div>
              {e.renderError ? (
                <div className="error">{e.renderError}</div>
              ) : (
                <code className="code">{e.renderedTarget}</code>
              )}
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
