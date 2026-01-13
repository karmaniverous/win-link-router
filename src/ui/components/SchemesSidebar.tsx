/**
 * Requirements addressed:
 * - Scheme list and add/remove/edit UX uses in-app dialogs (no window.prompt).
 */
import {
  ActionIcon,
  Group,
  Loader,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMemo, useState } from 'react';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../../core/config/appConfig';
import { AddSchemeDialog } from './AddSchemeDialog';
import { ConfirmDialog } from './ConfirmDialog';
import { formatSchemeStatusLabel } from './formatSchemeStatusLabel';
import { SchemeRow } from './schemesSidebar/SchemeRow';

/**
 * Requirements addressed:
 * - Main view shows a list of configured schemes.
 * - Users can add schemes without using window.prompt().
 * - Scheme rows provide controls (status info, register toggle, delete).
 * - Provide a refresh+reconcile action to re-check Windows status.
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
  onRefreshAndReconcile: () => void;
  onAddScheme: (scheme: SchemeConfig) => void;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRemoveScheme: (scheme: string) => void;
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
    onRefreshAndReconcile,
    onAddScheme,
    onChangeScheme,
    onRemoveScheme,
    onError,
  } = props;

  const [addOpen, setAddOpen] = useState(false);
  const [removeScheme, setRemoveScheme] = useState<string | null>(null);

  const statusByScheme = useMemo(() => {
    const map = new Map<string, (typeof statuses)[number]>();
    for (const s of statuses) map.set(s.scheme.toUpperCase(), s);
    return map;
  }, [statuses]);

  const existingSchemes = useMemo(() => {
    return (config?.schemes ?? []).map((s) => s.scheme);
  }, [config]);

  const canAdd = !readOnly && !loading && Boolean(config) && Boolean(presets);
  const showLoading = loading || !config || !presets;

  return (
    <Paper withBorder radius="md" p="sm" style={{ height: '100%' }}>
      <ConfirmDialog
        open={removeScheme !== null}
        title="Remove scheme"
        message={`Remove scheme ${removeScheme ?? ''}?`}
        confirmLabel="Remove"
        onCancel={() => {
          setRemoveScheme(null);
        }}
        onConfirm={() => {
          const target = removeScheme;
          setRemoveScheme(null);
          if (!target) return;
          onRemoveScheme(target);
        }}
      />
      <Stack gap="sm" style={{ height: '100%' }}>
        <Group justify="space-between" align="center">
          <Title order={2} size="h4" m={0}>
            Schemes
          </Title>
          <Group gap="xs">
            <Tooltip label="Refresh + reconcile" withArrow>
              <ActionIcon
                type="button"
                aria-label="Refresh schemes"
                variant="default"
                disabled={loading || readOnly || !config}
                onClick={() => {
                  onRefreshAndReconcile();
                }}
              >
                ⟳
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Add scheme" withArrow>
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
            </Tooltip>
          </Group>
        </Group>

        {/*
         * Requirements addressed:
         * - New schemes should respect per-user defaults for enable/register.
         * - Enforce autoRegister ⇒ autoEnable at the point we build defaults.
         */}
        {/*
         * Note: Add Scheme is already gated on config+presets being loaded.
         */}

        <AddSchemeDialog
          open={addOpen}
          presets={presets}
          existingSchemes={existingSchemes}
          defaults={{
            registered: config?.settings.autoRegisterNewSchemes ?? true,
            enabled:
              (config?.settings.autoRegisterNewSchemes ?? true) ||
              (config?.settings.autoEnableNewSchemes ?? true),
          }}
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
                    <SchemeRow
                      key={s.scheme}
                      scheme={s}
                      label={label}
                      selected={selectedScheme === s.scheme}
                      readOnly={readOnly}
                      status={status}
                      onSelect={() => {
                        onSelectScheme(s.scheme);
                      }}
                      onChangeScheme={onChangeScheme}
                      onRequestRemove={() => {
                        setRemoveScheme(s.scheme);
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
          </Stack>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
