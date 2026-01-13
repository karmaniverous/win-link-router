/**
 * Requirements addressed:
 * - The main window header provides Import/Export/Default Apps + Share actions.
 * - Share action opens the Share window (not a tab).
 */
import { Button, Group } from '@mantine/core';
import { IconShare2 } from '@tabler/icons-react';

export function AppHeaderActions(props: {
  loading: boolean;
  readOnly: boolean;
  onImport: () => void;
  onExport: () => void;
  onOpenDefaultApps: () => void;
  onOpenShare: () => void;
}) {
  return (
    <Group h="100%" px="md" justify="flex-end" gap="xs" wrap="wrap">
      <Button
        size="xs"
        variant="default"
        disabled={props.loading || props.readOnly}
        onClick={props.onImport}
      >
        Import
      </Button>
      <Button
        size="xs"
        variant="default"
        disabled={props.loading}
        onClick={props.onExport}
      >
        Export
      </Button>
      <Button size="xs" variant="default" onClick={props.onOpenDefaultApps}>
        Default Apps…
      </Button>
      <Button
        size="xs"
        variant="default"
        leftSection={<IconShare2 size={16} />}
        disabled={props.loading}
        onClick={props.onOpenShare}
      >
        Share
      </Button>
    </Group>
  );
}
