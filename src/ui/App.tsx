import { useEffect, useMemo, useState } from 'react';

import type { AppConfig } from '../core/config/appConfig';
import { getWinLinkRouterApi } from './api/winLinkRouterApi';
import { TestPanel } from './components/TestPanel';

function parseSchemeFromUri(uri: string): string | null {
  const idx = uri.indexOf(':');
  if (idx <= 0) return null;
  return uri.slice(0, idx).toUpperCase();
}

export function App() {
  const api = getWinLinkRouterApi();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [testUri, setTestUri] = useState('');
  const [routeErrorBanner, setRouteErrorBanner] = useState<string | null>(null);

  const [statuses, setStatuses] = useState<
    {
      scheme: string;
      enabled: boolean;
      registered: boolean;
      defaultStatus: 'default' | 'not-default' | 'unknown';
    }[]
  >([]);

  const statusByScheme = useMemo(() => {
    const map = new Map<string, (typeof statuses)[number]>();
    for (const s of statuses) map.set(s.scheme.toUpperCase(), s);
    return map;
  }, [statuses]);

  async function reload() {
    if (!api) return;
    const cfg = await api.appConfig.get();
    setConfig(cfg.config);
    setReadOnly(cfg.readOnly);
    setWarnings(cfg.warnings);

    const sts = await api.windows.getSchemeStatuses();
    setStatuses(
      sts.map((s) => ({
        scheme: s.scheme,
        enabled: s.enabled,
        registered: s.registered,
        defaultStatus: s.defaultStatus,
      })),
    );

    setSelectedScheme((prev) => {
      if (prev) return prev;
      return cfg.config.schemes[0]?.scheme ?? null;
    });
  }

  useEffect(() => {
    if (!api) {
      setError('Missing preload API (window.winLinkRouter).');
      setLoading(false);
      return;
    }

    let cancelled = false;
    void (async () => {
      try {
        await reload();

        const last = await api.routing.getLastRouteError();
        if (last) {
          const inferredScheme =
            'scheme' in (last.result as object) &&
            typeof (last.result as any).scheme === 'string'
              ? String((last.result as any).scheme)
              : parseSchemeFromUri(last.uri);

          if (!cancelled) {
            if (inferredScheme) setSelectedScheme(inferredScheme.toUpperCase());
            setTestUri(last.uri);
            setRouteErrorBanner(`Routing failed: ${last.result.type}`);
          }
          await api.routing.clearLastRouteError();
        }
      } catch (err) {
        if (!cancelled) setError((err as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  if (!api) {
    return (
      <main>
        <h1>win-link-router</h1>
        <p className="error">Missing preload API.</p>
      </main>
    );
  }

  return (
    <main>
      <header className="topbar">
        <h1>win-link-router</h1>
        <div className="topbarActions">
          <button
            type="button"
            onClick={() => void api.appConfig.importSchemes().then(reload)}
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => void api.appConfig.exportSchemes()}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => void api.windows.openDefaultApps()}
          >
            Default Apps…
          </button>
          <button
            type="button"
            onClick={() => void api.windows.ensureRegistration().then(reload)}
          >
            Ensure Registration
          </button>
        </div>
      </header>

      {loading ? <p className="muted">Loading…</p> : null}
      {error ? <p className="error">{error}</p> : null}
      {routeErrorBanner ? <p className="error">{routeErrorBanner}</p> : null}
      {warnings.length ? (
        <details>
          <summary>Warnings</summary>
          <pre>{warnings.join('\n')}</pre>
        </details>
      ) : null}
      {readOnly ? (
        <p className="warning">
          Config is read-only (shared config error). Settings can still be
          updated to fix the shared config path.
        </p>
      ) : null}

      <div className="layout">
        <aside className="sidebar">
          <h2>Schemes</h2>
          {!config ? null : (
            <ul className="list">
              {config.schemes.map((s) => {
                const status = statusByScheme.get(s.scheme);
                const label = `${s.scheme} ${
                  status ? `(${status.defaultStatus})` : ''
                }`;
                return (
                  <li key={s.scheme}>
                    <button
                      type="button"
                      className={selectedScheme === s.scheme ? 'selected' : ''}
                      onClick={() => {
                        setSelectedScheme(s.scheme);
                      }}
                    >
                      {label}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {!config?.schemes.length ? (
            <p className="muted">No schemes configured yet.</p>
          ) : null}
        </aside>

        <section className="content">
          <TestPanel
            api={api}
            scheme={selectedScheme}
            testUri={testUri}
            onChangeTestUri={setTestUri}
          />
        </section>
      </div>
    </main>
  );
}
