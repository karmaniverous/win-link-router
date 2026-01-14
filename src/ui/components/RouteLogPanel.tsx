import {
  Alert,
  Box,
  Button,
  Code,
  CopyButton,
  Group,
  Loader,
  ScrollArea,
  Stack,
  Switch,
  Text,
} from '@mantine/core';
import { IconCopy } from '@tabler/icons-react';
import { useCallback, useEffect, useState } from 'react';

import type { AppConfig, RouteLogMode } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { ConfirmDialog } from './ConfirmDialog';

interface RouteLogEntry {
  seq: number;
  when: string;
  result: RouteUriResult;
}

export function RouteLogPanel(props: {
  api: WinLinkRouterApi;
  config?: AppConfig | null;
  onDidChangeSettings?: () => void;
}) {
  const { api, config, onDidChangeSettings } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RouteLogEntry[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const [modeBusy, setModeBusy] = useState(false);

  const routeLogMode: RouteLogMode =
    config?.settings.routeLogMode ?? 'redacted';

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.routeLog.get();
      setEntries(res.entries);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [api.routeLog]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const lastSeq = entries.length ? entries[entries.length - 1]?.seq : null;

  return (
    <Box style={{ flex: 1, minHeight: 0, width: '100%', display: 'flex' }}>
      <ConfirmDialog
        open={confirmClearOpen}
        title="Clear routing log"
        message="Clear routing log?"
        confirmLabel="Clear"
        onCancel={() => {
          setConfirmClearOpen(false);
        }}
        onConfirm={() => {
          setConfirmClearOpen(false);
          void api.routeLog
            .clear()
            .then(() => reload())
            .catch((err: unknown) => {
              setError((err as Error).message);
            });
        }}
      />

      <Stack gap="sm" style={{ flex: 1, minHeight: 0, width: '100%' }}>
        <Group justify="flex-end" align="center">
          <Group gap="xs">
            <Button
              variant="default"
              onClick={() => void reload()}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              color="red"
              variant="default"
              onClick={() => {
                setConfirmClearOpen(true);
              }}
              disabled={loading}
            >
              Clear
            </Button>
          </Group>
        </Group>

        <Stack gap={6}>
          <Switch
            label="Redact new log entries"
            checked={routeLogMode === 'redacted'}
            disabled={loading || modeBusy}
            onChange={(e) => {
              const nextMode: RouteLogMode = e.currentTarget.checked
                ? 'redacted'
                : 'full';
              setModeBusy(true);
              void api.settings
                .set({ routeLogMode: nextMode })
                .then(() => {
                  onDidChangeSettings?.();
                })
                .catch((err: unknown) => {
                  setError((err as Error).message);
                })
                .finally(() => {
                  setModeBusy(false);
                });
            }}
          />

          <Text size="sm" c="dimmed">
            {routeLogMode === 'redacted'
              ? 'Redacted mode stores scheme-level info only (recommended).'
              : 'Full mode stores raw URIs/targets (less private).'}
          </Text>

          <Text size="sm" c="dimmed">
            Entries: {entries.length}
            {lastSeq !== null ? ` (latest seq: ${String(lastSeq)})` : ''}
          </Text>

          {loading ? (
            <Group gap="xs">
              <Loader size="sm" />
              <Text size="sm" c="dimmed">
                Loading…
              </Text>
            </Group>
          ) : null}

          {error ? (
            <Alert color="red" title="Error">
              {error}
            </Alert>
          ) : null}
        </Stack>

        <ScrollArea style={{ flex: 1, minHeight: 0 }} type="auto">
          <Stack gap="sm" pr="xs">
            {entries.length ? (
              <Stack gap="sm">
                {entries.map((e) => {
                  const pretty = JSON.stringify(e, null, 2);
                  return (
                    <Stack key={e.seq} gap={6}>
                      <Group
                        justify="space-between"
                        align="center"
                        wrap="nowrap"
                      >
                        <Text size="xs" c="dimmed">
                          #{String(e.seq)} • {e.when}
                        </Text>
                        <CopyButton value={pretty}>
                          {({ copied, copy }) => (
                            <Button
                              variant="default"
                              size="xs"
                              onClick={copy}
                              aria-label="Copy log entry JSON"
                            >
                              <Group gap={6} wrap="nowrap">
                                <IconCopy size={14} />
                                <Text size="xs">
                                  {copied ? 'Copied' : 'Copy'}
                                </Text>
                              </Group>
                            </Button>
                          )}
                        </CopyButton>
                      </Group>
                      <Code block>{pretty}</Code>
                    </Stack>
                  );
                })}
              </Stack>
            ) : (
              <Text size="sm" c="dimmed">
                No routing log entries yet.
              </Text>
            )}
          </Stack>
        </ScrollArea>
      </Stack>
    </Box>
  );
}
