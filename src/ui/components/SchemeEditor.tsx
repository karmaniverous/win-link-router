/**
 * Requirements addressed:
 * - Disabled schemes must have editing controls disabled (except re-enable).
 * - Registration changes should trigger best-effort reconciliation.
 * - Prefer Mantine primitives over bespoke form controls.
 * - Wireframe alignment: scheme enable/disable uses a power-button control in
 *   the scheme header (not inside the extractor section).
 */
import {
  ActionIcon,
  Button,
  Group,
  NativeSelect,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useMemo, useState } from 'react';

import type { PresetsFile, SchemeConfig } from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { ConfirmDialog } from './ConfirmDialog';
import {
  cloneFromPreset,
  findPresetsForScheme,
} from './schemeEditor/presetUtils';
import { SchemeEditorExtractor } from './schemeEditor/SchemeEditorExtractor';
import { SchemeEditorTemplates } from './schemeEditor/SchemeEditorTemplates';

export function SchemeEditor(props: {
  api: WinLinkRouterApi;
  scheme: SchemeConfig | null;
  presets: PresetsFile | null;
  readOnly: boolean;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRemoveScheme: (scheme: string) => void;
}) {
  const { api, scheme, presets, readOnly, onChangeScheme, onRemoveScheme } =
    props;

  if (!scheme) {
    return (
      <Paper withBorder radius="md" p="md">
        <Title order={2} size="h4" m={0}>
          Scheme
        </Title>
        <div style={{ marginTop: 8 }}>Select a scheme to edit.</div>
      </Paper>
    );
  }

  const schemePresets = findPresetsForScheme(presets, scheme.scheme);
  const defaultPreset = schemePresets.length
    ? (schemePresets.find(
        (p) =>
          p.presetId !== undefined && p.presetId === scheme.derivedFromPresetId,
      ) ?? schemePresets[0])
    : null;

  const presetOptions = useMemo(() => {
    return schemePresets.map((p, idx) => ({
      key: p.presetId ?? `preset-${String(idx)}`,
      label: p.presetId ?? `Preset ${String(idx + 1)}`,
      preset: p,
    }));
  }, [schemePresets]);

  const [removeSchemeOpen, setRemoveSchemeOpen] = useState(false);
  const [removeTemplateId, setRemoveTemplateId] = useState<string | null>(null);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetPresetKey, setResetPresetKey] = useState<string>('blank');

  const templateToRemove =
    removeTemplateId !== null
      ? (scheme.templates.find((t) => t.id === removeTemplateId) ?? null)
      : null;

  const editingDisabled = readOnly || !scheme.enabled;

  return (
    <Paper withBorder radius="md" p="md" style={{ height: '100%' }}>
      <ConfirmDialog
        open={removeSchemeOpen}
        title="Remove scheme"
        message={`Remove scheme ${scheme.scheme}?`}
        confirmLabel="Remove"
        onCancel={() => {
          setRemoveSchemeOpen(false);
        }}
        onConfirm={() => {
          setRemoveSchemeOpen(false);
          onRemoveScheme(scheme.scheme);
        }}
      />

      <ConfirmDialog
        open={removeTemplateId !== null}
        title="Remove template"
        message={`Remove template "${templateToRemove?.label ?? '(untitled)'}"?`}
        confirmLabel="Remove"
        onCancel={() => {
          setRemoveTemplateId(null);
        }}
        onConfirm={() => {
          const id = removeTemplateId;
          setRemoveTemplateId(null);
          if (!id) return;
          onChangeScheme({
            ...scheme,
            templates: scheme.templates.filter((x) => x.id !== id),
          });
        }}
      />

      <ConfirmDialog
        open={resetOpen}
        title="Reset to preset"
        message={`Reset ${scheme.scheme} to preset? This will overwrite extractor and templates.`}
        confirmLabel="Reset"
        onCancel={() => {
          setResetOpen(false);
        }}
        confirmDisabled={!presetOptions.length}
        onConfirm={() => {
          const chosen =
            presetOptions.find((p) => p.key === resetPresetKey)?.preset ?? null;
          if (!chosen) return;
          const reset = cloneFromPreset(chosen);
          setResetOpen(false);
          onChangeScheme(
            {
              ...reset,
              scheme: scheme.scheme,
              enabled: scheme.enabled,
            },
            { ensureRegistration: true },
          );
        }}
      >
        {presetOptions.length > 1 ? (
          <NativeSelect
            label="Preset"
            aria-label="Preset"
            value={resetPresetKey}
            onChange={(e) => {
              setResetPresetKey(e.currentTarget.value);
            }}
            data={presetOptions.map((p) => ({ value: p.key, label: p.label }))}
          />
        ) : null}
      </ConfirmDialog>

      <Stack gap="sm" style={{ height: '100%' }}>
        <Group justify="space-between" align="center">
          <Group gap="xs" align="center">
            <Title order={2} size="h4" m={0}>
              {scheme.scheme}
            </Title>

            <Tooltip
              label={scheme.enabled ? 'Disable scheme' : 'Enable scheme'}
              withArrow
            >
              <ActionIcon
                variant="default"
                aria-label="Toggle scheme enabled"
                disabled={readOnly}
                onClick={() => {
                  if (readOnly) return;

                  const nextEnabled = !scheme.enabled;
                  onChangeScheme(
                    {
                      ...scheme,
                      enabled: nextEnabled,
                      registered: nextEnabled ? scheme.registered : false,
                    },
                    { ensureRegistration: true },
                  );
                }}
              >
                <Text span fw={700} c={scheme.enabled ? 'green' : 'dimmed'}>
                  ⏻
                </Text>
              </ActionIcon>
            </Tooltip>
          </Group>

          <Group gap="xs" wrap="wrap">
            <Button
              size="xs"
              variant="default"
              onClick={() => void api.windows.openDefaultApps(scheme.scheme)}
            >
              Set default…
            </Button>
            {defaultPreset ? (
              <Button
                size="xs"
                variant="default"
                disabled={editingDisabled}
                onClick={() => {
                  const preferredKey =
                    presetOptions.find(
                      (p) =>
                        p.preset.presetId !== undefined &&
                        p.preset.presetId === scheme.derivedFromPresetId,
                    )?.key ?? presetOptions[0]?.key;
                  if (preferredKey) setResetPresetKey(preferredKey);
                  setResetOpen(true);
                }}
              >
                Reset to preset
              </Button>
            ) : null}
            <Button
              size="xs"
              variant="default"
              disabled={readOnly}
              onClick={() => {
                setRemoveSchemeOpen(true);
              }}
            >
              Remove
            </Button>
          </Group>
        </Group>

        <ScrollArea style={{ flex: 1 }} type="auto">
          <Stack gap="md" pr="xs">
            <SchemeEditorExtractor
              scheme={scheme}
              readOnly={readOnly}
              editingDisabled={editingDisabled}
              onChangeScheme={onChangeScheme}
            />

            <SchemeEditorTemplates
              scheme={scheme}
              readOnly={editingDisabled}
              onChangeScheme={onChangeScheme}
              onRequestRemoveTemplate={(templateId) => {
                setRemoveTemplateId(templateId);
              }}
            />
          </Stack>
        </ScrollArea>
      </Stack>
    </Paper>
  );
}
