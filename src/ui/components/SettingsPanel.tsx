/**
 * Requirements addressed:
 * - Lifecycle settings: Run in Background (RIB) and Start on Windows Login (SWL).
 * - Enforce SWL ⇒ RIB in the UI (cannot disable RIB while SWL is enabled).
 * - Shared config mode: browse + enable toggle in a compact, inline layout
 *   to preserve vertical space (wireframe-aligned).
 * - Keep this module focused on SettingsPanel; remove unused composite exports.
 */
import {
  Alert,
  Button,
  Group,
  Paper,
  Stack,
  Switch,
  TextInput,
} from '@mantine/core';
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

  const [runInBackground, setRunInBackground] = useState(false);
  const [runAtLogin, setRunAtLogin] = useState(false);
  const [useSharedConfig, setUseSharedConfig] = useState(false);
  const [sharedConfigPath, setSharedConfigPath] = useState<string>('');

  useEffect(() => {
    if (!config) return;
    setRunInBackground(config.settings.runInBackground ?? false);
    setRunAtLogin(config.settings.runAtLogin);
    const shared = config.settings.sharedConfigPath ?? '';
    setUseSharedConfig(Boolean(shared));
    setSharedConfigPath(shared);
  }, [config]);

  const debouncedRunInBackground = useDebouncedValue(runInBackground, 400);
  const debouncedRunAtLogin = useDebouncedValue(runAtLogin, 400);
  const debouncedUseSharedConfig = useDebouncedValue(useSharedConfig, 400);
  const debouncedSharedPath = useDebouncedValue(sharedConfigPath, 400);

  useEffect(() => {
    if (!config) return;

    const currentShared = config.settings.sharedConfigPath ?? null;
    const desiredShared = debouncedUseSharedConfig
      ? debouncedSharedPath.trim()
        ? debouncedSharedPath.trim()
        : currentShared
      : null;
    const currentRunInBackground = config.settings.runInBackground ?? false;
    const currentRunAtLogin = config.settings.runAtLogin;

    if (
      desiredShared === currentShared &&
      debouncedRunInBackground === currentRunInBackground &&
      debouncedRunAtLogin === currentRunAtLogin
    ) {
      return;
    }

    // In read-only mode we still allow settings changes to fix shared mode.
    void api.settings
      .set({
        runInBackground: debouncedRunInBackground,
        runAtLogin: debouncedRunAtLogin,
        sharedConfigPath: desiredShared,
      })
      .then(onDidChangeSettings)
      .catch(() => undefined);
  }, [
    api.settings,
    config,
    debouncedRunInBackground,
    debouncedRunAtLogin,
    debouncedUseSharedConfig,
    debouncedSharedPath,
    onDidChangeSettings,
  ]);

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Switch
            label="Start on Windows Login"
            checked={runAtLogin}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              setRunAtLogin(next);
              if (next) setRunInBackground(true);
            }}
          />

          <Switch
            label="Run in Background"
            checked={runInBackground}
            disabled={runAtLogin}
            onChange={(e) => {
              setRunInBackground(e.currentTarget.checked);
            }}
          />

          <Switch
            label="Use shared config"
            checked={useSharedConfig}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              setUseSharedConfig(next);
              if (!next) setSharedConfigPath('');
            }}
          />
        </Group>

        {useSharedConfig ? (
          <Group align="flex-end" wrap="nowrap" gap="xs">
            <TextInput
              label="Shared config path"
              style={{ flex: 1 }}
              value={sharedConfigPath}
              onChange={(e) => {
                setSharedConfigPath(e.currentTarget.value);
              }}
              placeholder="C:\\path\\to\\shared-config.json"
            />
            <Button
              variant="default"
              onClick={() => {
                void api.settings
                  .pickSharedConfigPath()
                  .then((res) => {
                    if (res.cancelled) return;
                    setUseSharedConfig(true);
                    setSharedConfigPath(res.filePath);
                  })
                  .catch(() => undefined);
              }}
            >
              Browse…
            </Button>
          </Group>
        ) : null}

        {useSharedConfig && !sharedConfigPath.trim() ? (
          <Alert color="yellow" title="Shared config needs a file path">
            Choose a JSON file path to enable shared mode.
          </Alert>
        ) : null}

        {readOnly ? (
          <Alert color="yellow" title="Read-only schemes">
            Scheme/template editing is read-only. Update the shared config path
            here to recover, or clear it to return to local config.
          </Alert>
        ) : null}
      </Stack>
    </Paper>
  );
}
