/**
 * Requirements addressed:
 * - Lifecycle settings: Run in Background (RIB) and Start on Windows Login (SWL).
 * - Enforce SWL ⇒ RIB in the UI (cannot disable RIB while SWL is enabled).
 * - Shared config mode: browse + enable toggle in a compact, inline layout
 *   to preserve vertical space (wireframe-aligned).
 * - Keep this module focused on SettingsPanel; remove unused composite exports.
 * - Apply RIB changes at runtime: enabling should create tray immediately and
 *   disabling should remove tray (showing the window first if it was hidden).
 * - Avoid persisting settings during initial hydration (prevents accidental
 *   overwrites of stored settings due to debounce timing).
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
import { useCallback, useEffect, useRef, useState } from 'react';

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

  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveWarning, setSaveWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Hydration guard: prevent the shared-path debounce from writing settings
  // during initial state sync (debounced values lag behind the hydrated state).
  const hydrationRef = useRef<{ useSharedConfig: boolean; sharedPath: string }>(
    { useSharedConfig: false, sharedPath: '' },
  );
  const sharedHydratedRef = useRef(false);

  useEffect(() => {
    if (!config) return;
    setRunInBackground(config.settings.runInBackground ?? false);
    setRunAtLogin(config.settings.runAtLogin);
    const shared = config.settings.sharedConfigPath ?? '';
    setUseSharedConfig(Boolean(shared));
    setSharedConfigPath(shared);

    hydrationRef.current = {
      useSharedConfig: Boolean(shared),
      sharedPath: shared,
    };
    sharedHydratedRef.current = false;
    setSaveError(null);
    setSaveWarning(null);
  }, [config]);

  const debouncedSharedPath = useDebouncedValue(sharedConfigPath, 400);

  const persistPatch = useCallback(
    async (patch: Record<string, unknown>) => {
      setBusy(true);
      try {
        const res = await api.settings.set(patch);
        const warnings = res.warnings?.length ? res.warnings.join('\n') : null;
        setSaveWarning(warnings);
        setSaveError(null);
        onDidChangeSettings();
      } catch (err) {
        setSaveError((err as Error).message);
      } finally {
        setBusy(false);
      }
    },
    [api.settings, onDidChangeSettings],
  );

  useEffect(() => {
    if (!config) return;
    if (!useSharedConfig) return;

    // Hydration guard: do not persist while debounced values are still catching
    // up to the state we just hydrated from config.
    if (!sharedHydratedRef.current) {
      const snap = hydrationRef.current;
      if (
        snap.useSharedConfig !== useSharedConfig ||
        snap.sharedPath !== debouncedSharedPath
      ) {
        return;
      }
      sharedHydratedRef.current = true;
    }

    const nextPath = debouncedSharedPath.trim();
    if (!nextPath) return;

    const current = config.settings.sharedConfigPath ?? '';
    if (nextPath === current) return;

    void persistPatch({ sharedConfigPath: nextPath });
  }, [config, debouncedSharedPath, persistPatch, useSharedConfig]);

  return (
    <Paper withBorder radius="md" p="sm">
      <Stack gap="sm">
        <Group align="flex-end" gap="md" wrap="wrap">
          <Switch
            label="Start on Windows Login"
            checked={runAtLogin}
            disabled={busy}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              setRunAtLogin(next);
              if (next) setRunInBackground(true);

              // Persist immediately: SWL implies RIB.
              if (next) {
                void persistPatch({ runAtLogin: true, runInBackground: true });
              } else {
                void persistPatch({ runAtLogin: false });
              }
            }}
          />

          <Switch
            label="Run in Background"
            checked={runInBackground}
            disabled={busy || runAtLogin}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              setRunInBackground(next);
              void persistPatch({ runInBackground: next });
            }}
          />

          <Switch
            label="Use shared config"
            checked={useSharedConfig}
            disabled={busy}
            onChange={(e) => {
              const next = e.currentTarget.checked;
              setUseSharedConfig(next);
              if (!next) {
                setSharedConfigPath('');
                void persistPatch({ sharedConfigPath: null });
              }
            }}
          />
        </Group>

        {useSharedConfig ? (
          <Group align="flex-end" wrap="nowrap" gap="xs">
            <TextInput
              label="Shared config path"
              style={{ flex: 1 }}
              value={sharedConfigPath}
              disabled={busy}
              onChange={(e) => {
                setSharedConfigPath(e.currentTarget.value);
              }}
              placeholder="C:\path\to\shared-config.json"
            />
            <Button
              variant="default"
              disabled={busy}
              onClick={() => {
                void api.settings
                  .pickSharedConfigPath()
                  .then((res) => {
                    if (res.cancelled) return;
                    setUseSharedConfig(true);
                    setSharedConfigPath(res.filePath);
                    void persistPatch({ sharedConfigPath: res.filePath });
                  })
                  .catch((err: unknown) => {
                    setSaveError((err as Error).message);
                  });
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

        {saveWarning ? (
          <Alert color="yellow" title="Warning" withCloseButton>
            <div style={{ whiteSpace: 'pre-wrap' }}>{saveWarning}</div>
          </Alert>
        ) : null}

        {saveError ? (
          <Alert color="red" title="Error" withCloseButton>
            {saveError}
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
