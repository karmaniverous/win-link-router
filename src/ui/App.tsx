import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../core/config/appConfig';
import { normalizeScheme } from '../core/config/appConfig';
import type { RouteUriResult } from '../core/routing/routeUri';
import type { WinLinkRouterApi } from './api/winLinkRouterApi';
import { getWinLinkRouterApi } from './api/winLinkRouterApi';
import { SchemeEditor } from './components/SchemeEditor';
import { SettingsPanel } from './components/SettingsPanel';
import { TestPanel } from './components/TestPanel';

function parseSchemeFromUri(uri: string): string | null {
  const idx = uri.indexOf(':');
  if (idx <= 0) return null;
  return uri.slice(0, idx).toUpperCase();
}

function getSchemeFromRouteResult(result: RouteUriResult): string | null {
  const maybeScheme = (result as { scheme?: unknown }).scheme;
  return typeof maybeScheme === 'string' ? maybeScheme : null;
}

function findPresetsForScheme(
  presets: PresetsFile | null,
  scheme: string,
): SchemeConfig[] {
  if (!presets) return [];
  return presets.presets.filter((x) => x.scheme === scheme);
}

function createBlankScheme(scheme: string): SchemeConfig {
  return {
    scheme,
    enabled: true,
    extractor: { pattern: '^(?<value>.*)$', flags: '' },
    templates: [],
  };
}

function cloneFromPreset(preset: SchemeConfig): SchemeConfig {
  const { presetId, ...rest } = preset;
  return {
    ...rest,
    presetId: undefined,
    derivedFromPresetId: presetId ?? undefined,
  };
}

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

  const statusByScheme = useMemo(() => {
    const map = new Map<string, (typeof statuses)[number]>();
    for (const s of statuses) map.set(s.scheme.toUpperCase(), s);
    return map;
  }, [statuses]);

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
          const inferredScheme =
            getSchemeFromRouteResult(last.result) ??
            parseSchemeFromUri(last.uri);

          if (!cancelledRef.current) {
            if (inferredScheme) setSelectedScheme(inferredScheme.toUpperCase());
            setTestUri(last.uri);
            setRouteErrorBanner(`Routing failed: ${last.result.type}`);
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

      <SettingsPanel
        api={api}
        config={config}
        readOnly={readOnly}
        onDidChangeSettings={() => void reload(api)}
      />

      <div className="layout">
        <aside className="sidebar">
          <div className="row">
            <h2>Schemes</h2>
            <div className="rowActions">
              <button
                type="button"
                disabled={readOnly}
                onClick={() => {
                  const raw = window.prompt(
                    'Scheme to add (e.g. TEL, MAILTO):',
                  );
                  if (!raw || !config) return;
                  let scheme: string;
                  try {
                    scheme = normalizeScheme(raw);
                  } catch (err) {
                    setError((err as Error).message);
                    return;
                  }
                  if (config.schemes.some((s) => s.scheme === scheme)) {
                    setError(`Scheme ${scheme} already exists.`);
                    return;
                  }

                  const schemePresets = findPresetsForScheme(presets, scheme);
                  let schemeConfig: SchemeConfig = createBlankScheme(scheme);

                  if (schemePresets.length === 1) {
                    const usePreset = window.confirm(
                      `Preset found for ${scheme}. Initialize from preset?`,
                    );
                    if (usePreset) {
                      schemeConfig = cloneFromPreset(schemePresets[0]);
                    }
                  } else if (schemePresets.length > 1) {
                    const options = schemePresets
                      .map((p) => p.presetId)
                      .filter((x): x is string => Boolean(x));
                    const chosen = window.prompt(
                      `Multiple presets found for ${scheme}. Enter presetId to use:\n${options.join(
                        '\n',
                      )}`,
                      options[0] ?? '',
                    );
                    if (chosen) {
                      const match = schemePresets.find(
                        (p) => p.presetId === chosen,
                      );
                      if (match) {
                        schemeConfig = cloneFromPreset(match);
                      } else {
                        setError(
                          `Unknown presetId "${chosen}". Added blank scheme.`,
                        );
                      }
                    }
                  }

                  const next: AppConfig = {
                    ...config,
                    schemes: [...config.schemes, schemeConfig],
                  };
                  setConfig(next);
                  configRef.current = next;
                  setSelectedScheme(scheme);
                  scheduleSave({ ensureRegistration: true });
                }}
              >
                +
              </button>
            </div>
          </div>
          {!config ? null : (
            <ul className="list">
              {config.schemes.map((s) => {
                const status = statusByScheme.get(s.scheme);
                const reg = status
                  ? status.registered
                    ? 'reg'
                    : 'unreg'
                  : 'reg?';
                const label = `${s.scheme} (${status?.defaultStatus ?? 'unknown'}, ${reg})`;
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
