/**
 * Requirements addressed:
 * - Main view provides scheme list + editor and supports Windows registration
 *   reconciliation.
 * - Provide scheme-row controls (register toggle, delete) and refresh+reconcile.
 * - Provide a GitHub header button to open the repo link externally.
 */
import {
  Alert,
  AppShell,
  Button,
  Group,
  Loader,
  Stack,
  Tabs,
  Title,
  Tooltip,
} from '@mantine/core';

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

const REPO_URL = 'https://github.com/karmaniverous/win-link-router';

export function App() {
  const api = getWinLinkRouterApi();

  if (!api) {
    return (
      <main className="appShell">
        <h1>win-link-router</h1>
        <p className="error">Missing preload API.</p>
      </main>
    );
  }

  const controller = useAppController(api);

  const ensureRegistrationAndReload = () => {
    return api.windows
      .ensureRegistration()
      .then((res) => {
        if (res.warnings.length) {
          controller.setRegistrationResult({
            kind: 'warn',
            message: res.warnings.join('\n'),
          });
        } else {
          controller.setRegistrationResult({
            kind: 'ok',
            message: 'Registration updated.',
          });
        }
        return controller.reload();
      })
      .catch((err: unknown) => {
        controller.setError((err as Error).message);
      });
  };

  const onTabChange = (value: string | null) => {
    if (!value) return;
    controller.setActiveTab(value as AppTabId);
  };

  return (
    <AppShell
      header={{ height: 64 }}
      navbar={{ width: 320, breakpoint: 'sm' }}
      padding="md"
    >
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Title order={1} size="h3">
            win-link-router
          </Title>
          <Group gap="xs" wrap="wrap">
            <Button
              size="xs"
              variant="default"
              onClick={() =>
                void api.appConfig.importSchemes().then(controller.reload)
              }
            >
              Import
            </Button>
            <Button
              size="xs"
              variant="default"
              onClick={() => void api.appConfig.exportSchemes()}
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
            <Tooltip label="Star this repo on GtHub!" withArrow>
              <Button
                size="xs"
                variant="default"
                onClick={() =>
                  void api.windows
                    .openExternal(REPO_URL)
                    .catch((err: unknown) => {
                      controller.setError((err as Error).message);
                    })
                }
              >
                GitHub
              </Button>
            </Tooltip>
            <Button
              size="xs"
              variant="default"
              onClick={() => void ensureRegistrationAndReload()}
            >
              Ensure Registration
            </Button>
          </Group>
        </Group>
      </AppShell.Header>

      <AppShell.Navbar p="xs">
        <SchemesSidebar
          loading={controller.loading}
          readOnly={controller.readOnly}
          config={controller.config}
          presets={controller.presets}
          statuses={controller.statuses}
          selectedScheme={controller.selectedScheme}
          onSelectScheme={controller.setSelectedScheme}
          onRefreshAndReconcile={() => void ensureRegistrationAndReload()}
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
      </AppShell.Navbar>

      <AppShell.Main>
        <Stack gap="md" style={{ minHeight: 0 }}>
          <Stack gap="xs" role="region" aria-label="Status">
            {controller.loading ? (
              <Group gap="xs">
                <Loader size="sm" />
                <span>Loading…</span>
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
                <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
                  {controller.registrationResult.message}
                </pre>
              </Alert>
            ) : null}
            <DefaultHandlerMismatchBanner
              statuses={controller.statuses}
              onOpenDefaultApps={() => void api.windows.openDefaultApps()}
            />
            {controller.warnings.length ? (
              <details>
                <summary>Warnings</summary>
                <pre>{controller.warnings.join('\n')}</pre>
              </details>
            ) : null}
            {controller.readOnly ? (
              <Alert color="yellow" title="Read-only config">
                Config is read-only (shared config error). Settings can still be
                updated to fix the shared config path.
              </Alert>
            ) : null}
          </Stack>

          <Tabs value={controller.activeTab} onChange={onTabChange}>
            <Tabs.List>
              {APP_TABS.map((t) => (
                <Tabs.Tab key={t.id} value={t.id}>
                  {t.label}
                </Tabs.Tab>
              ))}
            </Tabs.List>

            <Tabs.Panel value="settings" pt="xs">
              <SettingsPanel
                api={api}
                config={controller.config}
                readOnly={controller.readOnly}
                onDidChangeSettings={() => void controller.reload()}
              />
            </Tabs.Panel>
            <Tabs.Panel value="log" pt="xs">
              <RouteLogPanel api={api} />
            </Tabs.Panel>
            <Tabs.Panel value="test" pt="xs">
              <TestPanel
                api={api}
                config={controller.config}
                testUri={controller.testUri}
                onChangeTestUri={controller.setTestUri}
              />
            </Tabs.Panel>
          </Tabs>

          <div style={{ flex: 1, minHeight: 0 }}>
            <div style={{ height: '100%' }}>
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
        </Stack>
      </AppShell.Main>
    </AppShell>
  );
}
