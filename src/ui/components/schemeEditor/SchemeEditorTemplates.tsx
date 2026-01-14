/**
 * Requirements addressed:
 * - Scheme editor provides template list CRUD: add/edit/remove, enable/disable,
 *   reorder.
 * - Template string input is a textarea (3 rows).
 * - Standardize icon-only glyphs using Tabler icons.
 */
import {
  ActionIcon,
  Button,
  Group,
  Paper,
  ScrollArea,
  Stack,
  Text,
  Textarea,
  TextInput,
  Tooltip,
} from '@mantine/core';
import {
  IconArrowDown,
  IconArrowUp,
  IconPower,
  IconTrash,
} from '@tabler/icons-react';

import type {
  SchemeConfig,
  TemplateConfig,
} from '../../../core/config/appConfig';
import { newId, swap } from './schemeEditorUtils';

function iconColor(token: 'green' | 'dimmed'): string {
  if (token === 'green') return 'var(--mantine-color-green-6)';
  return 'var(--mantine-color-gray-6)';
}

export function SchemeEditorTemplates(props: {
  scheme: SchemeConfig;
  readOnly: boolean;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRequestRemoveTemplate: (templateId: string) => void;
}) {
  const { scheme, readOnly, onChangeScheme, onRequestRemoveTemplate } = props;

  const updateTemplate = (id: string, patch: Partial<TemplateConfig>) => {
    const templates = scheme.templates.map((t) =>
      t.id === id ? { ...t, ...patch } : t,
    );
    onChangeScheme({ ...scheme, templates });
  };

  const addTemplate = () => {
    const next: TemplateConfig = {
      id: newId('tpl'),
      label: 'New template',
      template: '',
      enabled: true,
    };
    onChangeScheme({ ...scheme, templates: [...scheme.templates, next] });
  };

  return (
    <Stack gap="sm" style={{ flex: 1, minHeight: 0 }}>
      <Group justify="space-between" align="center">
        <Text fw={600}>Templates</Text>
        <Button size="xs" disabled={readOnly} onClick={addTemplate}>
          Add template
        </Button>
      </Group>

      <ScrollArea style={{ flex: 1 }} type="auto" scrollbarSize={8}>
        <Stack gap="sm" pr="sm">
          {scheme.templates.length === 0 ? (
            <Text size="sm" c="dimmed">
              No templates yet. Add at least one enabled template to route
              links.
            </Text>
          ) : null}

          {scheme.templates.map((t, idx) => (
            <Paper
              key={t.id}
              withBorder
              radius="md"
              p="sm"
              style={{ backgroundColor: 'var(--mantine-color-gray-0)' }}
            >
              <Group justify="space-between" align="center" mb="xs">
                <Text fw={600}>{t.label || '(untitled)'}</Text>
                <Group gap={6}>
                  <Tooltip
                    label={t.enabled ? 'Disable template' : 'Enable template'}
                    withArrow
                  >
                    <ActionIcon
                      variant="default"
                      disabled={readOnly}
                      aria-label="Toggle template enabled"
                      onClick={() => {
                        if (readOnly) return;
                        updateTemplate(t.id, { enabled: !t.enabled });
                      }}
                    >
                      <IconPower
                        size={16}
                        style={{
                          color: t.enabled
                            ? iconColor('green')
                            : iconColor('dimmed'),
                        }}
                      />
                    </ActionIcon>
                  </Tooltip>
                  <ActionIcon
                    variant="default"
                    disabled={readOnly || idx === 0}
                    aria-label="Move template up"
                    onClick={() => {
                      onChangeScheme({
                        ...scheme,
                        templates: swap(scheme.templates, idx, idx - 1),
                      });
                    }}
                  >
                    <IconArrowUp size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="default"
                    disabled={readOnly || idx === scheme.templates.length - 1}
                    aria-label="Move template down"
                    onClick={() => {
                      onChangeScheme({
                        ...scheme,
                        templates: swap(scheme.templates, idx, idx + 1),
                      });
                    }}
                  >
                    <IconArrowDown size={16} />
                  </ActionIcon>
                  <ActionIcon
                    variant="default"
                    disabled={readOnly}
                    aria-label="Remove template"
                    onClick={() => {
                      onRequestRemoveTemplate(t.id);
                    }}
                  >
                    <IconTrash size={16} />
                  </ActionIcon>
                </Group>
              </Group>

              <Stack gap="xs">
                <TextInput
                  label="Label"
                  value={t.label}
                  disabled={readOnly}
                  onChange={(e) => {
                    updateTemplate(t.id, { label: e.currentTarget.value });
                  }}
                />

                <Textarea
                  label="Template"
                  autosize
                  minRows={1}
                  maxRows={6}
                  value={t.template}
                  disabled={readOnly}
                  onChange={(e) => {
                    updateTemplate(t.id, { template: e.currentTarget.value });
                  }}
                />

                {!t.template.trim() ? (
                  <Text size="sm" c="yellow">
                    Template is empty and will not save.
                  </Text>
                ) : null}
              </Stack>
            </Paper>
          ))}
        </Stack>
      </ScrollArea>
    </Stack>
  );
}
