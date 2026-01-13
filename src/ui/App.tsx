/**
 * Requirements addressed:
 * - Main view provides scheme list + editor and supports Windows registration
 *   reconciliation.
 * - Provide scheme-row controls (register toggle, delete) and refresh+reconcile.
 * - Provide a GitHub star button in the header (wireframe-aligned).
 * - Replace remaining bespoke renderer UI with Mantine primitives as found.
 */
import {
  Accordion,
  Alert,
  AppShell,
  Box,
  Button,
  Code,
  Group,
  Loader,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';
import GitHubButton from 'react-github-btn';

import type { SchemeConfig } from '../core/config/appConfig';
import { getWinLinkRouterApi } from './api/winLinkRouterApi';
import {
  APP_TABS,
  type AppTabId,
  useAppController,
} from './app/useAppController';
import { DefaultHandlerMismatchBanner } from './components/DefaultHandlerMismatchBanner';
import { RouteLogPanel } from './components/RouteLogPanel';
import { SchemeEditor } from './components/SchemeEditor';
import { SchemesSidebar } from './components/SchemesSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { TestPanel } from './components/TestPanel';

export function App() {
  const api = getWinLinkRouterApi();

  if (!api) {
    return (
      <AppShell padding="md" style={{ height: '100%' }}>
        <AppShell.Main>
          <Stack gap="sm">
            <Title order={2}>win-link-router</Title>
            <Alert color="red" title="Preload API unavailable">
              Missing preload API (window.winLinkRouter). Ensure the Electron
              preload script is configured and contextIsolation is enabled.
            </Alert>
          </Stack>
        </AppShell.Main>
      </AppShell>
    );
  }

  const controller = useAppController(api);

  const ensureRegistrationAndReload = () => {
    if (controller.readOnly) {
      return controller.reload().catch((err: unknown) => {
        controller.setError((err as Error).message);
      });
    }
    return controller.saveNow({ ensureRegistration: true });
  };

  const onTabChange = (value: string | null) => {
    if (!value) return;
    controller.setActiveTab(value as AppTabId);
  };

  return (
    <AppShell header={{ height: 64 }} padding="md" style={{ height: '100%' }}>
      <AppShell.Header>
        <Group h="100%" px="md" justify="flex-end" gap="xs" wrap="wrap">
          <Button
            size="xs"
            variant="default"
            disabled={controller.loading || controller.readOnly}
            onClick={() =>
              void api.appConfig
                .importSchemes()
                .then((res) => {
                  if (res.cancelled) return;
                  return controller.reload();
                })
                .catch((err: unknown) => {
                  controller.setError((err as Error).message);
                })
            }
          >
            Import
          </Button>
          <Button
            size="xs"
            variant="default"
            disabled={controller.loading}
            onClick={() =>
              void api.appConfig.exportSchemes().catch((err: unknown) => {
                controller.setError((err as Error).message);
              })
            }
          >
            Export
          </Button>
          <Button
            size="xs"
            variant="default"
            onClick={() => void api.windows.openDefaultApps()}
          >
            Default Apps…
          </Button>
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <GitHubButton
              href="https://github.com/karmaniverous/win-link-router"
              data-color-scheme="no-preference: light; light: light; dark: dark;"
              data-size="large"
              data-show-count="true"
              aria-label="Star karmaniverous/win-link-router on GitHub"
            >
              Star
            </GitHubButton>
          </Box>
        </Group>
      </AppShell.Header>

      <AppShell.Main style={{ height: '100%', minHeight: 0 }}>
        <Stack gap="md" style={{ minHeight: 0, height: '100%' }}>
          <Stack gap="xs" role="region" aria-label="Status">
            {controller.loading ? (
              <Group gap="xs">
                <Loader size="sm" />
                <Text size="sm" c="dimmed">
                  Loading…
                </Text>
              </Group>
            ) : null}
            {controller.error ? (
              <Alert color="red" title="Error">
                {controller.error}
              </Alert>
            ) : null}
            {controller.routeErrorBanner ? (
              <Alert color="red" title="Routing failed">
                {controller.routeErrorBanner}
              </Alert>
            ) : null}
            {controller.registrationResult ? (
              <Alert
                color={
                  controller.registrationResult.kind === 'ok'
                    ? 'green'
                    : 'yellow'
                }
                title={
                  controller.registrationResult.kind === 'ok'
                    ? 'Registration updated'
                    : 'Registration warning'
                }
                withCloseButton
                onClose={() => {
                  controller.setRegistrationResult(null);
                }}
              >
                <Code block>{controller.registrationResult.message}</Code>
              </Alert>
            ) : null}
            <DefaultHandlerMismatchBanner
              statuses={controller.statuses}
              onOpenDefaultApps={() => void api.windows.openDefaultApps()}
            />
            {controller.warnings.length ? (
              <Accordion variant="separated">
                <Accordion.Item value="warnings">
                  <Accordion.Control>Warnings</Accordion.Control>
                  <Accordion.Panel>
                    <Code block>{controller.warnings.join('\n')}</Code>
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            ) : null}
            {controller.readOnly ? (
              <Alert color="yellow" title="Read-only config">
                Config is read-only (shared config error). Settings can still be
                updated to fix the shared config path.
              </Alert>
            ) : null}
          </Stack>

          <Tabs
            value={controller.activeTab}
            onChange={onTabChange}
            style={{
              display: 'flex',
              flexDirection: 'column',
              minHeight: 0,
              flex: 1,
            }}
          >
            <Tabs.List grow style={{ width: '100%' }}>
              {APP_TABS.map((t) => (
                <Tabs.Tab key={t.id} value={t.id}>
                  {t.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel
              value="settings"
              pt="xs"
              style={{ minHeight: 0, flex: 1 }}
            >
              <Stack gap="sm" style={{ height: '100%', minHeight: 0 }}>
                <SettingsPanel
                  api={api}
                  config={controller.config}
                  readOnly={controller.readOnly}
                  onDidChangeSettings={() => void controller.reload()}
                />

                <Group
                  align="stretch"
                  wrap="nowrap"
                  gap="md"
                  style={{ minHeight: 0, flex: 1 }}
                >
                  <div style={{ width: 320, minHeight: 0, display: 'flex' }}>
                    <SchemesSidebar
                      loading={controller.loading}
                      readOnly={controller.readOnly}
                      config={controller.config}
                      presets={controller.presets}
                      statuses={controller.statuses}
                      selectedScheme={controller.selectedScheme}
                      onSelectScheme={controller.setSelectedScheme}
                      onRefreshAndReconcile={() =>
                        void ensureRegistrationAndReload()
                      }
                      onSetNewSchemeDefaults={(patch) => {
                        void api.settings
                          .set(patch)
                          .then(() => controller.reload())
                          .catch((err: unknown) => {
                            controller.setError((err as Error).message);
                          });
                      }}
                      onChangeScheme={(next, opts) => {
                        controller.onChangeScheme(next, opts);
                      }}
                      onRemoveScheme={controller.onRemoveScheme}
                      onError={(message) => {
                        controller.setError(message);
                      }}
                      onAddScheme={(schemeConfig: SchemeConfig) => {
                        controller.onAddScheme(schemeConfig);
                      }}
                    />
                  </div>

                  <div
                    style={{
                      flex: 1,
                      minHeight: 0,
                      display: 'flex',
                      height: '100%',
                    }}
                  >
                    <div style={{ flex: 1, minHeight: 0, height: '100%' }}>
                      <SchemeEditor
                        api={api}
                        presets={controller.presets}
                        readOnly={controller.readOnly}
                        scheme={
                          controller.config?.schemes.find(
                            (s) => s.scheme === controller.selectedScheme,
                          ) ?? null
                        }
                        onChangeScheme={(next, opts) => {
                          controller.onChangeScheme(next, opts);
                        }}
                        onRemoveScheme={(schemeToRemove) => {
                          controller.onRemoveScheme(schemeToRemove);
                        }}
                      />
                    </div>
                  </div>
                </Group>
              </Stack>
            </Tabs.Panel>
            <Tabs.Panel
              value="log"
              pt="xs"
              style={{ minHeight: 0, flex: 1, display: 'flex' }}
            >
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <RouteLogPanel
                  api={api}
                  config={controller.config}
                  onDidChangeSettings={() => void controller.reload()}
                />
              </div>
            </Tabs.Panel>
            <Tabs.Panel
              value="test"
              pt="xs"
              style={{ minHeight: 0, flex: 1, display: 'flex' }}
            >
              <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
                <TestPanel
                  api={api}
                  config={controller.config}
                  testUri={controller.testUri}
                  onChangeTestUri={controller.setTestUri}
                />
              </div>
            </Tabs.Panel>
          </Tabs>
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
