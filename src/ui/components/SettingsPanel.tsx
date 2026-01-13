import {
  Alert,
  Paper,
  Stack,
  Switch,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
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
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Title order={2} size="h4" m={0}>
          Settings
        </Title>

        <Switch
          label="Run at login"
          checked={runAtLogin}
          onChange={(e) => {
            setRunAtLogin(e.currentTarget.checked);
          }}
        />

        <TextInput
          label="Shared config path (optional)"
          value={sharedConfigPath}
          onChange={(e) => {
            setSharedConfigPath(e.currentTarget.value);
          }}
          placeholder="C:\path\to\shared-config.json"
        />

        <Switch
          label="Store full routing log (less private)"
          checked={routeLogMode === 'full'}
          onChange={(e) => {
            setRouteLogMode(e.currentTarget.checked ? 'full' : 'redacted');
          }}
        />

        <Text size="sm" c="dimmed">
          Default is redacted (no raw URIs/targets). Enable full logging only if
          you understand the privacy implications.
        </Text>

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
