import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../core/config/appConfig';
import type { WinLinkRouterApi } from './api/winLinkRouterApi';
import { getWinLinkRouterApi } from './api/winLinkRouterApi';
import { SchemeEditor } from './components/SchemeEditor';
import { SchemesSidebar } from './components/SchemesSidebar';
import { SettingsAndLogPanel } from './components/SettingsPanel';
import { TestPanel } from './components/TestPanel';
import {
  formatRouteFailureBanner,
  inferSchemeForRouteFailure,
} from './routing/routeFailureUi';

function validateConfigBeforeSave(config: AppConfig): string | null {
  for (const scheme of config.schemes) {
    const flags = scheme.extractor.flags ?? '';
    if (flags.includes('g')) {
      return `Cannot save: ${scheme.scheme} extractor flags must not include "g".`;
    }

    try {
      RegExp(scheme.extractor.pattern, flags);
    } catch (err) {
      return `Cannot save: ${scheme.scheme} extractor regex is invalid: ${
        (err as Error).message
      }`;
    }

    for (const tpl of scheme.templates) {
      if (!tpl.template.trim()) {
        return `Cannot save: ${scheme.scheme} template "${tpl.label}" is empty.`;
      }
    }
  }

  return null;
}

export function App() {
  const api = getWinLinkRouterApi();

  const cancelledRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const configRef = useRef<AppConfig | null>(null);
  const ensureRegistrationRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [presets, setPresets] = useState<PresetsFile | null>(null);

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

  const reload = useCallback(async (api: WinLinkRouterApi) => {
    const cfg = await api.appConfig.get();
    setConfig(cfg.config);
    setReadOnly(cfg.readOnly);
    setWarnings(cfg.warnings);
    configRef.current = cfg.config;

    const p = await api.presets.get();
    setPresets(p);

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
  }, []);

  const scheduleSave = useCallback(
    (opts: { ensureRegistration?: boolean } = {}) => {
      if (!api) return;
      if (readOnly) return;
      ensureRegistrationRef.current =
        ensureRegistrationRef.current || Boolean(opts.ensureRegistration);

      if (saveTimerRef.current) {
        window.clearTimeout(saveTimerRef.current);
      }
      saveTimerRef.current = window.setTimeout(() => {
        const latest = configRef.current;
        if (!latest) return;

        const validationError = validateConfigBeforeSave(latest);
        if (validationError) {
          setError(validationError);
          return;
        }

        void api.appConfig
          .set(latest)
          .then(async () => {
            if (ensureRegistrationRef.current) {
              ensureRegistrationRef.current = false;
              await api.windows.ensureRegistration();
            }
          })
          .then(() => {
            setError(null);
            return reload(api);
          })
          .catch((err: unknown) => {
            setError((err as Error).message);
          });
      }, 450);
    },
    [api, readOnly, reload],
  );

  useEffect(() => {
    if (!api) {
      setError('Missing preload API (window.winLinkRouter).');
      setLoading(false);
      return;
    }

    cancelledRef.current = false;
    void (async () => {
      try {
        await reload(api);

        const last = await api.routing.getLastRouteError();
        if (last) {
          const inferredScheme = inferSchemeForRouteFailure({
            uri: last.uri,
            result: last.result,
          });

          if (!cancelledRef.current) {
            if (inferredScheme) setSelectedScheme(inferredScheme);
            setTestUri(last.uri);
            setRouteErrorBanner(formatRouteFailureBanner(last.result));
          }
          await api.routing.clearLastRouteError();
        }
      } catch (err) {
        if (!cancelledRef.current) setError((err as Error).message);
      } finally {
        if (!cancelledRef.current) setLoading(false);
      }
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [api, reload]);

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
            onClick={() =>
              void api.appConfig.importSchemes().then(() => reload(api))
            }
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
            onClick={() =>
              void api.windows.ensureRegistration().then(() => reload(api))
            }
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

      <SettingsAndLogPanel
        api={api}
        config={config}
        readOnly={readOnly}
        onDidChangeSettings={() => void reload(api)}
      />

      <div className="layout">
        <SchemesSidebar
          readOnly={readOnly}
          config={config}
          presets={presets}
          statuses={statuses}
          selectedScheme={selectedScheme}
          onSelectScheme={setSelectedScheme}
          onError={(message) => {
            setError(message);
          }}
          onAddScheme={(schemeConfig: SchemeConfig) => {
            if (!config) return;
            if (config.schemes.some((s) => s.scheme === schemeConfig.scheme)) {
              setError(`Scheme ${schemeConfig.scheme} already exists.`);
              return;
            }

            const next: AppConfig = {
              ...config,
              schemes: [...config.schemes, schemeConfig],
            };
            setConfig(next);
            configRef.current = next;
            setSelectedScheme(schemeConfig.scheme);
            scheduleSave({ ensureRegistration: true });
          }}
        />

        <section className="content">
          <SchemeEditor
            api={api}
            presets={presets}
            readOnly={readOnly}
            scheme={
              config?.schemes.find((s) => s.scheme === selectedScheme) ?? null
            }
            onChangeScheme={(next, opts) => {
              if (!config) return;
              const updated: AppConfig = {
                ...config,
                schemes: config.schemes.map((s) =>
                  s.scheme === next.scheme ? next : s,
                ),
              };
              setConfig(updated);
              configRef.current = updated;
              scheduleSave(opts);
            }}
            onRemoveScheme={(schemeToRemove) => {
              if (!config) return;
              const updated: AppConfig = {
                ...config,
                schemes: config.schemes.filter(
                  (s) => s.scheme !== schemeToRemove,
                ),
              };
              setConfig(updated);
              configRef.current = updated;
              if (selectedScheme === schemeToRemove) {
                setSelectedScheme(updated.schemes[0]?.scheme ?? null);
              }
              scheduleSave({ ensureRegistration: true });
            }}
          />

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
