/**
 * Requirements addressed:
 * - Test tab infers scheme from URI (no scheme selector required).
 * - Disabled schemes can still be evaluated, but show a clear banner.
 */
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

import type { AppConfig, SchemeConfig } from '../../core/config/appConfig';
import { normalizeScheme } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

function looksLikeWindowsPath(value: string): boolean {
  // Absolute drive path: C:\... or C:/...
  if (/^[a-zA-Z]:[\\/]/.test(value)) return true;
  // UNC path: \\server\share\...
  if (value.startsWith('\\\\')) return true;
  return false;
}

function inferSchemeFromUri(uri: string): string | null {
  const trimmed = uri.trim();
  if (!trimmed) return null;
  if (looksLikeWindowsPath(trimmed)) return null;

  const idx = trimmed.indexOf(':');
  if (idx <= 0) return null;

  const rawScheme = trimmed.slice(0, idx);
  try {
    return normalizeScheme(rawScheme);
  } catch {
    return null;
  }
}

function findScheme(config: AppConfig | null, scheme: string | null) {
  if (!config || !scheme) return null;
  return config.schemes.find((s) => s.scheme === scheme) ?? null;
}

export function TestPanel(props: {
  api: WinLinkRouterApi;
  config: AppConfig | null;
  testUri: string;
  onChangeTestUri: (next: string) => void;
}) {
  const { api, config, testUri, onChangeTestUri } = props;

  const debouncedUri = useDebouncedValue(testUri, 300);
  const inferredScheme = useMemo(() => inferSchemeFromUri(testUri), [testUri]);
  const debouncedScheme = useDebouncedValue(inferredScheme, 300);

  const schemeConfig = useMemo(() => {
    return findScheme(config, inferredScheme);
  }, [config, inferredScheme]);

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

        <Text size="sm" c="dimmed">
          Scheme:{' '}
          <Text span fw={600}>
            {inferredScheme ?? '(not inferred)'}
          </Text>
        </Text>

        {schemeConfig && !schemeConfig.enabled ? (
          <Alert color="yellow" title="Scheme is disabled">
            Routing for {schemeConfig.scheme} is currently disabled. Test output
            below is for debugging only.
          </Alert>
        ) : null}

        <TextInput
          label="Incoming URI"
          value={testUri}
          onChange={(e) => {
            onChangeTestUri(e.currentTarget.value);
          }}
          placeholder="e.g. tel:+1 (555) 123-4567"
        />

        {!testUri.trim() ? (
          <Text size="sm" c="dimmed">
            Enter a URI to run tests.
          </Text>
        ) : !inferredScheme ? (
          <Text size="sm" c="dimmed">
            Could not infer a scheme from the URI. Include a scheme prefix like
            <Text span fw={600}>
              {' '}
              tel:
            </Text>
            .
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
