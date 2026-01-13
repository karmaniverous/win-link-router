/**
 * Requirements addressed:
 * - Scheme list rows provide controls (info tooltip, enable toggle, register
 *   toggle, default status indicator, delete).
 * - Disabled schemes are visually greyed out and cannot be registered; default
 *   status icon shows a disabled state.
 * - Enforce registered ⇒ enabled when disabling a scheme (disable clears
 *   registered).
 */
import {
  ActionIcon,
  Code,
  Group,
  NavLink,
  Stack,
  Text,
  Tooltip,
} from '@mantine/core';

import type { SchemeConfig } from '../../../core/config/appConfig';

export interface SchemeWindowsStatusLike {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: 'default' | 'not-default' | 'unknown';
  expectedProgId: string;
  actualProgId?: string | null;
}

function renderDefaultStatusIcon(opts: {
  schemeEnabled: boolean;
  status: SchemeWindowsStatusLike | null;
}): { glyph: string; color: string; tooltip: string } {
  if (!opts.schemeEnabled) {
    return { glyph: '–', color: 'dimmed', tooltip: 'Scheme disabled' };
  }

  const ds = opts.status?.defaultStatus ?? 'unknown';
  if (ds === 'default') {
    return { glyph: '✓', color: 'green', tooltip: 'Default in Windows' };
  }
  if (ds === 'not-default') {
    return { glyph: '×', color: 'red', tooltip: 'Not default in Windows' };
  }
  return { glyph: '?', color: 'yellow', tooltip: 'Default status unknown' };
}

function renderInfoTooltip(opts: {
  scheme: SchemeConfig;
  status: SchemeWindowsStatusLike | null;
}) {
  const statusText = opts.status
    ? `${opts.status.defaultStatus}, ${
        opts.status.registered ? 'Registered' : 'Not registered'
      }`
    : 'Status unavailable';

  return (
    <Stack gap={4}>
      <Text size="sm" fw={600}>
        {opts.scheme.scheme}
      </Text>
      <Text size="sm" c="dimmed">
        Enabled: {opts.scheme.enabled ? 'yes' : 'no'}; Desired registration:{' '}
        {opts.scheme.registered ? 'yes' : 'no'}
      </Text>
      <Text size="sm" c="dimmed">
        Windows: {statusText}
      </Text>
      {opts.status ? (
        <>
          <Text size="sm" c="dimmed">
            Expected ProgId: <Code>{opts.status.expectedProgId}</Code>
          </Text>
          <Text size="sm" c="dimmed">
            Actual ProgId: <Code>{opts.status.actualProgId ?? '(null)'}</Code>
          </Text>
        </>
      ) : null}
    </Stack>
  );
}

export function SchemeRow(props: {
  scheme: SchemeConfig;
  label: string;
  selected: boolean;
  readOnly: boolean;
  status: SchemeWindowsStatusLike | null;
  onSelect: () => void;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRequestRemove: () => void;
}) {
  const { scheme, label, selected, readOnly, status } = props;

  const canToggleRegistered = !readOnly && scheme.enabled;
  const defaultIcon = renderDefaultStatusIcon({
    schemeEnabled: scheme.enabled,
    status,
  });

  return (
    <NavLink
      label={label}
      style={{ opacity: scheme.enabled ? 1 : 0.55 }}
      active={selected}
      onClick={props.onSelect}
      rightSection={
        <Group gap={6} wrap="nowrap">
          <Tooltip
            label={scheme.enabled ? 'Disable scheme' : 'Enable scheme'}
            withArrow
          >
            <ActionIcon
              variant="default"
              aria-label="Toggle enabled"
              disabled={readOnly}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (readOnly) return;

                const nextEnabled = !scheme.enabled;
                props.onChangeScheme(
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

          <Tooltip
            label={renderInfoTooltip({ scheme, status })}
            withArrow
            multiline
            w={340}
          >
            <ActionIcon
              variant="default"
              aria-label="Scheme info"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              i
            </ActionIcon>
          </Tooltip>

          <Tooltip
            label={
              scheme.enabled
                ? 'Toggle Windows candidate registration'
                : 'Enable scheme to allow registration'
            }
            withArrow
          >
            <ActionIcon
              variant="default"
              aria-label="Toggle registration"
              disabled={!canToggleRegistered}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (!canToggleRegistered) return;
                props.onChangeScheme(
                  { ...scheme, registered: !scheme.registered },
                  { ensureRegistration: true },
                );
              }}
            >
              <Text span fw={700} c={scheme.registered ? 'green' : 'dimmed'}>
                R
              </Text>
            </ActionIcon>
          </Tooltip>

          <Tooltip label={defaultIcon.tooltip} withArrow>
            <ActionIcon
              variant="default"
              aria-label="Default status"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
              }}
            >
              <Text span fw={700} c={defaultIcon.color}>
                {defaultIcon.glyph}
              </Text>
            </ActionIcon>
          </Tooltip>

          <Tooltip label="Remove scheme" withArrow>
            <ActionIcon
              variant="default"
              color="red"
              aria-label="Remove scheme"
              disabled={readOnly}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                props.onRequestRemove();
              }}
            >
              –
            </ActionIcon>
          </Tooltip>
        </Group>
      }
    />
  );
}
