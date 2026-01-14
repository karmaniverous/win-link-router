/**
 * Requirements addressed:
 * - Avoid modal prompts for default-handler mismatch.
 * - Surface mismatch in the UI the next time the main window is shown.
 */
import { Alert, Button, Group, Stack, Text } from '@mantine/core';
import { useMemo, useState } from 'react';

import { computeDefaultHandlerMismatch } from '../../core/windows/defaultHandlerMismatch';

interface StatusLike {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: 'default' | 'not-default' | 'unknown';
}

export function DefaultHandlerMismatchBanner(props: {
  statuses: StatusLike[];
  onOpenDefaultApps: () => void;
}) {
  const [dismissed, setDismissed] = useState(false);

  const mismatch = useMemo(() => {
    return computeDefaultHandlerMismatch(props.statuses);
  }, [props.statuses]);

  if (dismissed) return null;
  if (!mismatch) return null;

  return (
    <Alert
      color="yellow"
      title="Default app not set for some protocols"
      withCloseButton
      p="xs"
      onClose={() => {
        setDismissed(true);
      }}
    >
      <Group justify="space-between" align="flex-start" wrap="wrap" gap="sm">
        <Stack gap={2} style={{ flex: 1, minWidth: 240 }}>
          <Text size="sm">
            Some enabled + registered schemes are not currently set to
            win-link-router in Windows.
          </Text>

          {mismatch.notDefault.length ? (
            <Text size="sm">
              Not default:{' '}
              <Text span fw={600}>
                {mismatch.notDefault.join(', ')}
              </Text>
            </Text>
          ) : null}

          {mismatch.unknown.length ? (
            <Text size="sm">
              Unknown:{' '}
              <Text span fw={600}>
                {mismatch.unknown.join(', ')}
              </Text>
            </Text>
          ) : null}
        </Stack>

        <Group justify="flex-end" style={{ flexShrink: 0 }}>
          <Button variant="default" size="xs" onClick={props.onOpenDefaultApps}>
            Open Default Apps…
          </Button>
        </Group>
      </Group>
    </Alert>
  );
}
