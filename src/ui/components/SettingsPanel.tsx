import { useEffect, useState } from 'react';

import type { AppConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function SettingsPanel(props: {
  api: WinLinkRouterApi;
  config: AppConfig | null;
  readOnly: boolean;
  onDidChangeSettings: () => void;
}) {
  const { api, config, readOnly, onDidChangeSettings } = props;

  const [runAtLogin, setRunAtLogin] = useState(false);
  const [sharedConfigPath, setSharedConfigPath] = useState<string>('');

  useEffect(() => {
    if (!config) return;
    setRunAtLogin(config.settings.runAtLogin);
    setSharedConfigPath(config.settings.sharedConfigPath ?? '');
  }, [config]);

  const debouncedRunAtLogin = useDebouncedValue(runAtLogin, 400);
  const debouncedSharedPath = useDebouncedValue(sharedConfigPath, 400);

  useEffect(() => {
    if (!config) return;

    const desiredShared = debouncedSharedPath.trim()
      ? debouncedSharedPath.trim()
      : null;
    const currentShared = config.settings.sharedConfigPath ?? null;
    const currentRunAtLogin = config.settings.runAtLogin;

    if (
      desiredShared === currentShared &&
      debouncedRunAtLogin === currentRunAtLogin
    ) {
      return;
    }

    // In read-only mode we still allow settings changes to fix shared mode.
    void api.settings
      .set({
        runAtLogin: debouncedRunAtLogin,
        sharedConfigPath: desiredShared,
      })
      .then(onDidChangeSettings)
      .catch(() => undefined);
  }, [
    api.settings,
    config,
    debouncedRunAtLogin,
    debouncedSharedPath,
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

      {readOnly ? (
        <p className="warning">
          Scheme/template editing is read-only. Update the shared config path
          here to recover, or clear it to return to local config.
        </p>
      ) : null}
    </section>
  );
}
