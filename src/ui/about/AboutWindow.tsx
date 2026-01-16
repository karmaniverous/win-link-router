/**
 * Requirements addressed:
 * - Provide a modal About window with current version and update status.
 * - About must check for updates when opened and provide manual controls:
 *   - Check for updates
 *   - Update Now (download if needed, then install immediately)
 * - Auto-updates checkbox (default ON) persists to per-user settings.
 * - About controls must enable/disable appropriately as update status changes.
 */
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Group,
  Loader,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';

import { APP_TAGLINE, APP_TITLE } from '../../core/app/branding';
import { getWinLinkRouterApi } from '../api/winLinkRouterApi';

interface UpdateStatus {
  stage: string;
  currentVersion: string;
  autoUpdatesEnabled: boolean;
  lastCheckedAt?: string;
  availableVersion?: string;
  downloadedVersion?: string;
  progressPercent?: number;
  message?: string;
}

function formatStatusLine(status: UpdateStatus): string {
  if (status.stage === 'disabled')
    return status.message ?? 'Updates are disabled.';
  if (status.stage === 'checking') return 'Checking for updates…';
  if (status.stage === 'downloading') return 'Downloading update…';
  if (status.stage === 'downloaded') return 'Update downloaded.';
  if (status.stage === 'available') return 'New version available.';
  if (status.stage === 'upToDate') return 'Your application is up to date!';
  if (status.stage === 'error') return status.message ?? 'Update error.';
  return status.message ?? '';
}

function canCheckForUpdates(stage: string): boolean {
  // Enabled states: idle, upToDate, error.
  if (stage === 'idle') return true;
  if (stage === 'upToDate') return true;
  if (stage === 'error') return true;

  // Disabled while in-progress or irrelevant.
  if (stage === 'checking') return false;
  if (stage === 'available') return false;
  if (stage === 'downloading') return false;
  if (stage === 'downloaded') return false;
  if (stage === 'disabled') return false;

  // Default: conservative.
  return false;
}

function canUpdateNow(stage: string): boolean {
  // Enabled only when it makes sense to install/download.
  if (stage === 'available') return true;
  if (stage === 'downloaded') return true;

  // Explicitly disabled per UX decision.
  if (stage === 'error') return false;
  if (stage === 'checking') return false;
  if (stage === 'downloading') return false;
  if (stage === 'upToDate') return false;
  if (stage === 'disabled') return false;
  if (stage === 'idle') return false;

  return false;
}

export function AboutWindow() {
  const api = getWinLinkRouterApi();
  const [status, setStatus] = useState<UpdateStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const currentVersion = status?.currentVersion ?? '(unknown)';

  const pollMs = 1000;

  const refreshStatus = useCallback(async () => {
    if (!api) return;
    const res = await api.updates.getStatus();
    setStatus(res.status as UpdateStatus);
  }, [api]);

  useEffect(() => {
    if (!api) return;

    let cancelled = false;

    const loadOnce = async () => {
      try {
        const res = await api.updates.getStatus();
        if (cancelled) return;
        setStatus(res.status as UpdateStatus);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        setError((err as Error).message);
      }
    };

    void loadOnce();

    const timer = window.setInterval(() => {
      void loadOnce();
    }, pollMs);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [api]);

  // Check for updates when opened.
  useEffect(() => {
    if (!api) return;
    void api.updates
      .checkNow()
      .catch((err: unknown) => {
        setError((err as Error).message);
      })
      .finally(() => void refreshStatus());
  }, [api]);

  if (!api) {
    return (
      <Stack gap="sm" p="md">
        <Alert color="red" title="Preload API unavailable">
          Missing preload API (window.winLinkRouter). Ensure the Electron
          preload script is configured and contextIsolation is enabled.
        </Alert>
      </Stack>
    );
  }

  const statusLine = status ? formatStatusLine(status) : 'Loading…';
  const newVersion =
    status?.availableVersion ?? status?.downloadedVersion ?? null;
  const autoUpdatesEnabled = status?.autoUpdatesEnabled ?? true;
  const stage = status?.stage ?? 'idle';
  const allowCheck = canCheckForUpdates(stage);
  const allowUpdateNow = canUpdateNow(stage);

  return (
    <Stack gap="sm" p="md" style={{ height: '100%' }}>
      <Stack gap={2}>
        <Title order={2}>{APP_TITLE}</Title>
        <Text c="dimmed">{APP_TAGLINE}</Text>
      </Stack>

      <Divider />

      <Text size="sm">
        Current version:{' '}
        <Text span fw={600}>
          {currentVersion}
        </Text>
      </Text>

      {status ? (
        <Text size="sm" c={status.stage === 'error' ? 'red' : 'dimmed'}>
          {statusLine}
          {status.stage === 'downloading' &&
          typeof status.progressPercent === 'number'
            ? ` (${status.progressPercent.toFixed(0)}%)`
            : ''}
        </Text>
      ) : (
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Group>
      )}

      {newVersion && status?.stage !== 'upToDate' ? (
        <Text size="sm">
          New version available:{' '}
          <Text span fw={600}>
            {newVersion}
          </Text>
        </Text>
      ) : null}

      {autoUpdatesEnabled && status?.stage === 'downloaded' ? (
        <Text size="sm" c="dimmed">
          If you don&apos;t update now, the application will update when you
          quit the application.
        </Text>
      ) : null}

      {error ? (
        <Alert color="red" title="Error">
          {error}
        </Alert>
      ) : null}

      <Checkbox
        label="Enable automatic updates"
        checked={autoUpdatesEnabled}
        disabled={busy}
        onChange={(e) => {
          const next = e.currentTarget.checked;
          setBusy(true);
          void api.settings
            .set({ autoUpdatesEnabled: next })
            .catch((err: unknown) => {
              setError((err as Error).message);
            })
            .finally(() => {
              setBusy(false);
            });
        }}
      />

      <Group justify="flex-end" gap="xs" mt="auto">
        <Button
          variant="default"
          onClick={() => {
            void api.updates
              .checkNow()
              .catch((err: unknown) => {
                setError((err as Error).message);
              })
              .finally(() => void refreshStatus());
          }}
          disabled={busy || !allowCheck}
        >
          Check for updates
        </Button>

        <Button
          onClick={() => {
            setBusy(true);
            void api.updates
              .updateNow()
              .catch((err: unknown) => {
                setError((err as Error).message);
              })
              .finally(() => {
                setBusy(false);
                void refreshStatus();
              });
          }}
          disabled={busy || !allowUpdateNow}
        >
          Update Now!
        </Button>
      </Group>
    </Stack>
  );
}
