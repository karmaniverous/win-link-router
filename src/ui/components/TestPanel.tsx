import {
  Alert,
  Code,
  Group,
  Paper,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export function TestPanel(props: {
  api: WinLinkRouterApi;
  scheme: string | null;
  testUri: string;
  onChangeTestUri: (next: string) => void;
}) {
  const { api, scheme, testUri, onChangeTestUri } = props;

  const debouncedUri = useDebouncedValue(testUri, 300);
  const debouncedScheme = useDebouncedValue(scheme, 300);

  const [result, setResult] = useState<{
    matchGroups?: Record<string, string>;
    evaluations: {
      templateId: string;
      label: string;
      enabled: boolean;
      renderedTarget?: string;
      renderError?: string;
    }[];
    error?: string;
  } | null>(null);

  const canRun = useMemo(() => {
    return Boolean(debouncedScheme && debouncedUri.trim().length > 0);
  }, [debouncedScheme, debouncedUri]);

  useEffect(() => {
    if (!canRun || !debouncedScheme) {
      setResult(null);
      return;
    }

    let cancelled = false;
    void api.test
      .evaluate(debouncedScheme, debouncedUri)
      .then((r) => {
        if (cancelled) return;
        setResult(r);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setResult({ evaluations: [], error: (err as Error).message });
      });

    return () => {
      cancelled = true;
    };
  }, [api, canRun, debouncedScheme, debouncedUri]);

  return (
    <Paper withBorder radius="md" p="md">
      <Stack gap="sm">
        <Title order={2} size="h4" m={0}>
          Test
        </Title>

        <TextInput
          label="Incoming URI"
          value={testUri}
          onChange={(e) => {
            onChangeTestUri(e.currentTarget.value);
          }}
          placeholder="e.g. tel:+1 (555) 123-4567"
        />

        {!scheme ? (
          <Text size="sm" c="dimmed">
            Select a scheme to run tests.
          </Text>
        ) : null}

        {result?.error ? (
          <Alert color="red" title="Error">
            {result.error}
          </Alert>
        ) : null}

        {result?.matchGroups ? (
          <details>
            <summary>Match groups</summary>
            <Code block>{JSON.stringify(result.matchGroups, null, 2)}</Code>
          </details>
        ) : null}

        {result?.evaluations.length ? (
          <Stack gap="sm">
            {result.evaluations.map((e) => (
              <Paper key={e.templateId} withBorder radius="md" p="sm">
                <Group justify="space-between" align="center" mb={6}>
                  <Text fw={600}>{e.label}</Text>
                  <Text size="sm" c="dimmed">
                    {e.enabled ? 'enabled' : 'disabled'}
                  </Text>
                </Group>
                {e.renderError ? (
                  <Alert color="red" title="Render error">
                    {e.renderError}
                  </Alert>
                ) : (
                  <Code block>{e.renderedTarget}</Code>
                )}
              </Paper>
            ))}
          </Stack>
        ) : null}
      </Stack>
    </Paper>
  );
}
