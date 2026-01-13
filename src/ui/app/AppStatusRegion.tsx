/**
 * Requirements addressed:
 * - Show loading/errors/warnings/read-only status in a pinned status region.
 * - Surface default-handler mismatch as a non-blocking banner.
 */
import {
  Accordion,
  Alert,
  Code,
  Group,
  Loader,
  Stack,
  Text,
} from '@mantine/core';

import { DefaultHandlerMismatchBanner } from '../components/DefaultHandlerMismatchBanner';

interface SchemeStatusLike {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: 'default' | 'not-default' | 'unknown';
  expectedProgId: string;
  actualProgId?: string | null;
}

export function AppStatusRegion(props: {
  loading: boolean;
  error: string | null;
  routeErrorBanner: string | null;
  registrationResult: { kind: 'ok' | 'warn'; message: string } | null;
  warnings: string[];
  readOnly: boolean;
  statuses: SchemeStatusLike[];
  onClearRegistrationResult: () => void;
  onOpenDefaultApps: () => void;
}) {
  return (
    <Stack gap="xs" role="region" aria-label="Status">
      {props.loading ? (
        <Group gap="xs">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">
            Loading…
          </Text>
        </Group>
      ) : null}

      {props.error ? (
        <Alert color="red" title="Error">
          {props.error}
        </Alert>
      ) : null}

      {props.routeErrorBanner ? (
        <Alert color="red" title="Routing failed">
          {props.routeErrorBanner}
        </Alert>
      ) : null}

      {props.registrationResult ? (
        <Alert
          color={props.registrationResult.kind === 'ok' ? 'green' : 'yellow'}
          title={
            props.registrationResult.kind === 'ok'
              ? 'Registration updated'
              : 'Registration warning'
          }
          withCloseButton
          onClose={props.onClearRegistrationResult}
        >
          <Code block>{props.registrationResult.message}</Code>
        </Alert>
      ) : null}

      <DefaultHandlerMismatchBanner
        statuses={props.statuses}
        onOpenDefaultApps={props.onOpenDefaultApps}
      />

      {props.warnings.length ? (
        <Accordion variant="separated">
          <Accordion.Item value="warnings">
            <Accordion.Control>Warnings</Accordion.Control>
            <Accordion.Panel>
              <Code block>{props.warnings.join('\n')}</Code>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}

      {props.readOnly ? (
        <Alert color="yellow" title="Read-only config">
          Config is read-only (shared config error). Settings can still be
          updated to fix the shared config path.
        </Alert>
      ) : null}
    </Stack>
  );
}
