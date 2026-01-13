import {
  ActionIcon,
  Code,
  Group,
  Loader,
  NavLink,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import { useMemo, useState } from 'react';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../../core/config/appConfig';
import { AddSchemeDialog } from './AddSchemeDialog';
import { formatSchemeStatusLabel } from './formatSchemeStatusLabel';

/**
 * Requirements addressed:
 * - Main view shows a list of configured schemes.
 * - Users can add schemes without using window.prompt().
 * - Disable actions and show a loading indicator while config/presets load.
 */
export function SchemesSidebar(props: {
  loading: boolean;
  readOnly: boolean;
  config: AppConfig | null;
  presets: PresetsFile | null;
  statuses: {
    scheme: string;
    enabled: boolean;
    registered: boolean;
    defaultStatus: 'default' | 'not-default' | 'unknown';
    expectedProgId: string;
    actualProgId?: string | null;
  }[];
  selectedScheme: string | null;
  onSelectScheme: (scheme: string) => void;
  onAddScheme: (scheme: SchemeConfig) => void;
  onError: (message: string) => void;
}) {
  const {
    loading,
    readOnly,
    config,
    presets,
    statuses,
    selectedScheme,
    onSelectScheme,
    onAddScheme,
    onError,
  } = props;

  const [addOpen, setAddOpen] = useState(false);

  const statusByScheme = useMemo(() => {
    const map = new Map<string, (typeof statuses)[number]>();
    for (const s of statuses) map.set(s.scheme.toUpperCase(), s);
    return map;
  }, [statuses]);

  const selectedStatus = useMemo(() => {
    if (!selectedScheme) return null;
    return statusByScheme.get(selectedScheme.toUpperCase()) ?? null;
  }, [selectedScheme, statusByScheme]);

  const existingSchemes = useMemo(() => {
    return (config?.schemes ?? []).map((s) => s.scheme);
  }, [config]);

  const canAdd = !readOnly && !loading && Boolean(config) && Boolean(presets);
  const showLoading = loading || !config || !presets;

  return (
    <Paper withBorder radius="md" p="sm" style={{ height: '100%' }}>
      <Stack gap="sm" style={{ height: '100%' }}>
        <Group justify="space-between" align="center">
          <Title order={2} size="h4" m={0}>
            Schemes
          </Title>
          <ActionIcon
            type="button"
            aria-label="Add scheme"
            variant="default"
            disabled={!canAdd}
            onClick={() => {
              setAddOpen(true);
            }}
          >
            +
          </ActionIcon>
        </Group>

        <AddSchemeDialog
          open={addOpen}
          presets={presets}
          existingSchemes={existingSchemes}
          onCancel={() => {
            setAddOpen(false);
          }}
          onAdd={(scheme: SchemeConfig) => {
            if (config?.schemes.some((s) => s.scheme === scheme.scheme)) {
              onError(`Scheme ${scheme.scheme} already exists.`);
              return;
            }
            onAddScheme(scheme);
            setAddOpen(false);
          }}
        />

        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap={4} pr="xs">
            {showLoading ? (
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loading schemes…
                </Text>
              </Group>
            ) : null}

            {config
              ? config.schemes.map((s) => {
                  const status = statusByScheme.get(s.scheme) ?? null;
                  const label = formatSchemeStatusLabel({
                    scheme: s.scheme,
                    enabled: s.enabled,
                    status,
                  });

                  return (
                    <NavLink
                      key={s.scheme}
                      label={label}
                      active={selectedScheme === s.scheme}
                      onClick={() => {
                        onSelectScheme(s.scheme);
                      }}
                    />
                  );
                })
              : null}

            {!config?.schemes.length ? (
              <Text size="sm" c="dimmed">
                No schemes configured yet.
              </Text>
            ) : null}

            {selectedStatus ? (
              <Paper withBorder radius="md" p="sm">
                <Group justify="space-between" align="center" mb={6}>
                  <Text fw={600}>{selectedStatus.scheme}</Text>
                  <Text size="sm" c="dimmed">
                    {selectedStatus.defaultStatus}
                  </Text>
                </Group>
                <Text size="sm" c="dimmed">
                  Expected ProgId: <Code>{selectedStatus.expectedProgId}</Code>
                </Text>
                <Text size="sm" c="dimmed">
                  Actual ProgId:{' '}
                  <Code>{selectedStatus.actualProgId ?? '(null)'}</Code>
                </Text>
              </Paper>
            ) : null}
          </Stack>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
