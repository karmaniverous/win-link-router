/**
 * Requirements addressed:
 * - UI loads config/presets/windows statuses on start and shows loading state.
 * - UI autosaves config changes (debounced), and can optionally trigger Windows
 *   registration reconciliation.
 * - On routing failure, the UI prefills the Test input and switches to the Test
 *   tab with an actionable error banner.
 * - Keep App.tsx small by moving orchestration into a hook.
 */
import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import {
  formatRouteFailureBanner,
  inferSchemeForRouteFailure,
} from '../routing/routeFailureUi';
import { validateConfigBeforeSave } from './validateConfigBeforeSave';

export const APP_TABS = [
  { id: 'settings', label: 'Settings' },
  { id: 'log', label: 'Log' },
  { id: 'test', label: 'Test' },
] as const;

export type AppTabId = (typeof APP_TABS)[number]['id'];

export function useAppController(api: WinLinkRouterApi) {
  const cancelledRef = useRef(false);
  const saveTimerRef = useRef<number | null>(null);
  const configRef = useRef<AppConfig | null>(null);
  const ensureRegistrationRef = useRef(false);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [registrationResult, setRegistrationResult] = useState<{
    kind: 'ok' | 'warn';
    message: string;
  } | null>(null);

  const [config, setConfig] = useState<AppConfig | null>(null);
  const [readOnly, setReadOnly] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [presets, setPresets] = useState<PresetsFile | null>(null);

  const [selectedScheme, setSelectedScheme] = useState<string | null>(null);
  const [testUri, setTestUri] = useState('');
  const [routeErrorBanner, setRouteErrorBanner] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<AppTabId>('settings');

  const [statuses, setStatuses] = useState<
    {
      scheme: string;
      enabled: boolean;
      registered: boolean;
      defaultStatus: 'default' | 'not-default' | 'unknown';
      expectedProgId: string;
      actualProgId?: string | null;
    }[]
  >([]);

  const reload = useCallback(async () => {
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
        expectedProgId: s.expectedProgId,
        actualProgId: s.actualProgId,
      })),
    );

    setSelectedScheme((prev) => {
      if (prev) return prev;
      return cfg.config.schemes[0]?.scheme ?? null;
    });
  }, [api.appConfig, api.presets, api.windows]);

  const scheduleSave = useCallback(
    (opts: { ensureRegistration?: boolean } = {}) => {
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
              const res = await api.windows.ensureRegistration();
              if (res.warnings.length) {
                setRegistrationResult({
                  kind: 'warn',
                  message: res.warnings.join('\n'),
                });
              } else {
                setRegistrationResult({
                  kind: 'ok',
                  message: 'Registration updated.',
                });
              }
            }
          })
          .then(() => {
            setError(null);
            return reload();
          })
          .catch((err: unknown) => {
            setError((err as Error).message);
          });
      }, 450);
    },
    [api.appConfig, api.windows, readOnly, reload],
  );

  useEffect(() => {
    cancelledRef.current = false;
    void (async () => {
      try {
        await reload();

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
            setActiveTab('test');
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
  }, [api.routing, reload]);

  const onAddScheme = useCallback(
    (schemeConfig: SchemeConfig) => {
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
    },
    [config, scheduleSave],
  );

  const onChangeScheme = useCallback(
    (next: SchemeConfig, opts?: { ensureRegistration?: boolean }) => {
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
    },
    [config, scheduleSave],
  );

  const onRemoveScheme = useCallback(
    (schemeToRemove: string) => {
      if (!config) return;
      const updated: AppConfig = {
        ...config,
        schemes: config.schemes.filter((s) => s.scheme !== schemeToRemove),
      };
      setConfig(updated);
      configRef.current = updated;
      setSelectedScheme((prev) => {
        if (prev !== schemeToRemove) return prev;
        return updated.schemes[0]?.scheme ?? null;
      });
      scheduleSave({ ensureRegistration: true });
    },
    [config, scheduleSave],
  );

  return {
    loading,
    error,
    setError,
    registrationResult,
    setRegistrationResult,
    config,
    readOnly,
    warnings,
    presets,
    statuses,
    selectedScheme,
    setSelectedScheme,
    testUri,
    setTestUri,
    routeErrorBanner,
    activeTab,
    setActiveTab,
    reload,
    scheduleSave,
    onAddScheme,
    onChangeScheme,
    onRemoveScheme,
  };
}
