import { useEffect, useState } from 'react';

import type { AppConfig, RouteLogMode } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { RouteLogPanel } from './RouteLogPanel';

export function SettingsPanel(props: {
  api: WinLinkRouterApi;
  config: AppConfig | null;
  readOnly: boolean;
  onDidChangeSettings: () => void;
}) {
  const { api, config, readOnly, onDidChangeSettings } = props;

  const [runAtLogin, setRunAtLogin] = useState(false);
  const [sharedConfigPath, setSharedConfigPath] = useState<string>('');
  const [routeLogMode, setRouteLogMode] = useState<RouteLogMode>('redacted');

  useEffect(() => {
    if (!config) return;
    setRunAtLogin(config.settings.runAtLogin);
    setSharedConfigPath(config.settings.sharedConfigPath ?? '');
    setRouteLogMode(config.settings.routeLogMode ?? 'redacted');
  }, [config]);

  const debouncedRunAtLogin = useDebouncedValue(runAtLogin, 400);
  const debouncedSharedPath = useDebouncedValue(sharedConfigPath, 400);
  const debouncedRouteLogMode = useDebouncedValue(routeLogMode, 400);

  useEffect(() => {
    if (!config) return;

    const desiredShared = debouncedSharedPath.trim()
      ? debouncedSharedPath.trim()
      : null;
    const currentShared = config.settings.sharedConfigPath ?? null;
    const currentRunAtLogin = config.settings.runAtLogin;
    const desiredRouteLogMode = debouncedRouteLogMode;
    const currentRouteLogMode = config.settings.routeLogMode ?? 'redacted';

    if (
      desiredShared === currentShared &&
      debouncedRunAtLogin === currentRunAtLogin &&
      desiredRouteLogMode === currentRouteLogMode
    ) {
      return;
    }

    // In read-only mode we still allow settings changes to fix shared mode.
    void api.settings
      .set({
        runAtLogin: debouncedRunAtLogin,
        sharedConfigPath: desiredShared,
        routeLogMode: desiredRouteLogMode,
      })
      .then(onDidChangeSettings)
      .catch(() => undefined);
  }, [
    api.settings,
    config,
    debouncedRunAtLogin,
    debouncedSharedPath,
    debouncedRouteLogMode,
    onDidChangeSettings,
  ]);

  return (
    <section className="panel">
      <h2>Settings</h2>

      <label className="field">
        <span>Run at login</span>
        <input
          type="checkbox"
          checked={runAtLogin}
          onChange={(e) => {
            setRunAtLogin(e.target.checked);
          }}
        />
      </label>

      <label className="field">
        <span>Shared config path (optional)</span>
        <input
          value={sharedConfigPath}
          onChange={(e) => {
            setSharedConfigPath(e.target.value);
          }}
          placeholder="C:\path\to\shared-config.json"
        />
      </label>

      <label className="field">
        <span>Store full routing log (less private)</span>
        <input
          type="checkbox"
          checked={routeLogMode === 'full'}
          onChange={(e) => {
            setRouteLogMode(e.target.checked ? 'full' : 'redacted');
          }}
        />
      </label>
      <p className="muted">
        Default is redacted (no raw URIs/targets). Enable full logging only if
        you understand the privacy implications.
      </p>

      {readOnly ? (
        <p className="warning">
          Scheme/template editing is read-only. Update the shared config path
          here to recover, or clear it to return to local config.
        </p>
      ) : null}
    </section>
  );
}

export function SettingsAndLogPanel(
  props: Parameters<typeof SettingsPanel>[0],
) {
  return (
    <>
      <SettingsPanel {...props} />
      <RouteLogPanel api={props.api} />
    </>
  );
}
