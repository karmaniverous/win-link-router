/**
 * Requirements addressed:
 * - Show loading/errors/warnings/read-only status in a pinned status region.
 * - Surface default-handler mismatch as a non-blocking banner.
 * - Registration warnings must be normal wrapped text (not pre/code styling).
 */
import { Accordion, Alert, Group, Loader, Stack, Text } from '@mantine/core';

import { computeDefaultHandlerMismatch } from '../../core/windows/defaultHandlerMismatch';
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
  const mismatch = computeDefaultHandlerMismatch(props.statuses);

  const hasAnyStatus =
    props.loading ||
    Boolean(props.error) ||
    Boolean(props.routeErrorBanner) ||
    Boolean(props.registrationResult) ||
    props.warnings.length > 0 ||
    props.readOnly ||
    Boolean(mismatch);

  // If there is nothing to show, render nothing so the App-level layout does
  // not reserve vertical space above the tabs.
  if (!hasAnyStatus) return null;

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
        <Alert color="red" title="Error" p="xs">
          {props.error}
        </Alert>
      ) : null}

      {props.routeErrorBanner ? (
        <Alert color="red" title="Routing failed" p="xs">
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
          p="xs"
          onClose={props.onClearRegistrationResult}
        >
          <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
            {props.registrationResult.message}
          </Text>
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
              <Text size="sm" style={{ whiteSpace: 'pre-wrap' }}>
                {props.warnings.join('\n')}
              </Text>
            </Accordion.Panel>
          </Accordion.Item>
        </Accordion>
      ) : null}

      {props.readOnly ? (
        <Alert color="yellow" title="Read-only config" p="xs">
          Config is read-only (shared config error). Settings can still be
          updated to fix the shared config path.
        </Alert>
      ) : null}
    </Stack>
  );
}
