import {
  Alert,
  Button,
  Code,
  Group,
  Loader,
  Paper,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useCallback, useEffect, useState } from 'react';

import type { RouteUriResult } from '../../core/routing/routeUri';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { ConfirmDialog } from './ConfirmDialog';

interface RouteLogEntry {
  seq: number;
  when: string;
  result: RouteUriResult;
}

export function RouteLogPanel(props: { api: WinLinkRouterApi }) {
  const { api } = props;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [entries, setEntries] = useState<RouteLogEntry[]>([]);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

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
    <Paper withBorder radius="md" p="md">
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

      <Stack gap="sm">
        <Group justify="space-between" align="center">
          <Title order={2} size="h4" m={0}>
            Routing log
          </Title>
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

        {entries.length ? (
          <details>
            <summary>Show entries (redacted)</summary>
            <Code block>{JSON.stringify(entries, null, 2)}</Code>
          </details>
        ) : (
          <Text size="sm" c="dimmed">
            No routing log entries yet.
          </Text>
        )}
      </Stack>
    </Paper>
  );
}
