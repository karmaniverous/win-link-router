/**
 * Requirements addressed:
 * - On first run, when config is empty and onboarding is not completed, prompt
 *   the user to choose which bundled presets to add.
 * - Allow selecting at most one preset per scheme (link type).
 * - Preselect the TEL WhatsApp preset when available.
 * - Avoid window.confirm/prompt; use in-app dialogs.
 */
import {
  Alert,
  Button,
  Group,
  Radio,
  ScrollArea,
  Stack,
  Text,
} from '@mantine/core';
import { useEffect, useMemo, useState } from 'react';

import type { PresetsFile, SchemeConfig } from '../../core/config/appConfig';
import { Modal } from './Modal';
import { cloneFromPreset } from './schemeEditor/presetUtils';

type ChoiceMap = Record<string, string>; // scheme -> chosen key ("none" | presetKey)

function byScheme(presets: PresetsFile): Map<string, SchemeConfig[]> {
  const map = new Map<string, SchemeConfig[]>();
  for (const p of presets.presets) {
    const list = map.get(p.scheme) ?? [];
    list.push(p);
    map.set(p.scheme, list);
  }
  return map;
}

function presetKey(preset: SchemeConfig, idx: number): string {
  return preset.presetId ?? `preset-${String(idx)}`;
}

function presetLabel(preset: SchemeConfig, idx: number): string {
  if (preset.presetId) return preset.presetId;
  return `${preset.scheme} preset ${String(idx + 1)}`;
}

function buildDefaultChoices(presets: PresetsFile): ChoiceMap {
  const groups = byScheme(presets);
  const schemes = Array.from(groups.keys()).sort((a, b) => a.localeCompare(b));

  const out: ChoiceMap = {};
  for (const scheme of schemes) {
    out[scheme] = 'none';
  }

  // Default: preselect TEL WhatsApp if present.
  const tel = groups.get('TEL') ?? [];
  const preferred = tel.find((p) => p.presetId === 'tel.whatsapp') ?? null;
  if (preferred) out.TEL = preferred.presetId ?? 'none';

  return out;
}

function choicesToSchemes(
  presets: PresetsFile,
  choices: ChoiceMap,
): SchemeConfig[] {
  const groups = byScheme(presets);
  const out: SchemeConfig[] = [];

  for (const [scheme, selection] of Object.entries(choices)) {
    if (selection === 'none') continue;

    const list = groups.get(scheme) ?? [];
    const found =
      list.find((p) => p.presetId === selection) ??
      list.find((p, idx) => presetKey(p, idx) === selection) ??
      null;
    if (!found) continue;

    const cloned = cloneFromPreset(found);
    out.push({
      ...cloned,
      scheme,
    });
  }

  // Deterministic ordering.
  out.sort((a, b) => a.scheme.localeCompare(b.scheme));
  return out;
}

export function OnboardingPresetsDialog(props: {
  open: boolean;
  presets: PresetsFile;
  busy?: boolean;
  onSkip: () => void;
  onApply: (schemesToAdd: SchemeConfig[]) => void;
}) {
  const { open, presets, busy = false, onSkip, onApply } = props;

  const groups = useMemo(() => byScheme(presets), [presets]);
  const schemes = useMemo(() => Array.from(groups.keys()).sort(), [groups]);

  const [choices, setChoices] = useState<ChoiceMap>({});

  useEffect(() => {
    if (!open) return;
    setChoices(buildDefaultChoices(presets));
  }, [open, presets]);

  const hasAnyPresets = schemes.length > 0;

  return (
    <Modal
      open={open}
      title="Choose presets to get started"
      onClose={onSkip}
      footer={
        <>
          <Button variant="default" onClick={onSkip} disabled={busy}>
            Skip
          </Button>
          <Button
            onClick={() => {
              onApply(choicesToSchemes(presets, choices));
            }}
            disabled={busy || !hasAnyPresets}
          >
            Apply presets
          </Button>
        </>
      }
    >
      <Stack gap="sm">
        <Text size="sm" c="dimmed">
          Pick one preset per link type. You can always change schemes and
          templates later.
        </Text>

        {!hasAnyPresets ? (
          <Alert color="yellow" title="No presets available">
            This build does not include any presets.
          </Alert>
        ) : null}

        <ScrollArea h={320} type="auto">
          <Stack gap="md" pr="xs">
            {schemes.map((scheme) => {
              const list = groups.get(scheme) ?? [];
              return (
                <Radio.Group
                  key={scheme}
                  value={choices[scheme] ?? 'none'}
                  onChange={(value) => {
                    setChoices((prev) => ({ ...prev, [scheme]: value }));
                  }}
                  name={`preset-${scheme}`}
                  label={scheme}
                >
                  <Group gap="md" mt={6} wrap="wrap">
                    <Radio value="none" label="None" disabled={busy} />
                    {list.map((p, idx) => {
                      const key = presetKey(p, idx);
                      const label = presetLabel(p, idx);
                      return (
                        <Radio
                          key={key}
                          value={key}
                          label={label}
                          disabled={busy}
                        />
                      );
                    })}
                  </Group>
                </Radio.Group>
              );
            })}
          </Stack>
        </ScrollArea>
      </Stack>
    </Modal>
  );
}
