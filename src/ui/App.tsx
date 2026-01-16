/**
 * Requirements addressed:
 * - Main view provides scheme list + editor and supports Windows registration
 *   reconciliation.
 * - Provide scheme-row controls (register toggle, delete) and refresh+reconcile.
 * - Provide a Share button in the header that opens the Share window.
 * - Replace remaining bespoke renderer UI with Mantine primitives as found.
 * - Show APP_TITLE + APP_TAGLINE in the upper-left header region.
 * - Dim the main window with an overlay while modal windows (About/Share) are open.
 */
import {
  Alert,
  AppShell,
  Box,
  Group,
  Overlay,
  Stack,
  Tabs,
  Text,
  Title,
} from '@mantine/core';

import { APP_TAGLINE, APP_TITLE } from '../core/app/branding';
import type { SchemeConfig } from '../core/config/appConfig';
import { getWinLinkRouterApi } from './api/winLinkRouterApi';
import { AppHeaderActions } from './app/AppHeaderActions';
import { AppStatusRegion } from './app/AppStatusRegion';
import { SettingsTab } from './app/SettingsTab';
import {
  APP_TABS,
  type AppTabId,
  useAppController,
} from './app/useAppController';
import { useModalOverlay } from './app/useModalOverlay';
import { OnboardingPresetsDialog } from './components/OnboardingPresetsDialog';
import { RouteLogPanel } from './components/RouteLogPanel';
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
  const modalOverlayActive = useModalOverlay(api);

  const onboardingAvailable =
    controller.onboardingOpen && Boolean(controller.presets);

  const applyOnboarding = (schemes: SchemeConfig[]) => {
    void controller.completeOnboarding({ addSchemes: schemes });
  };

  const skipOnboarding = () => {
    void controller.completeOnboarding();
  };

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
    <Box style={{ height: '100%', position: 'relative' }}>
      <AppShell header={{ height: 64 }} padding="md" style={{ height: '100%' }}>
        {onboardingAvailable && controller.presets ? (
          <OnboardingPresetsDialog
            open={true}
            presets={controller.presets}
            busy={controller.onboardingBusy}
            onSkip={skipOnboarding}
            onApply={applyOnboarding}
          />
        ) : null}

        <AppShell.Header>
          <Group h="100%" px="md" justify="space-between" align="center">
            <Stack gap={0}>
              <Title order={3} m={0}>
                {APP_TITLE}
              </Title>
              <Text size="sm" c="dimmed">
                {APP_TAGLINE}
              </Text>
            </Stack>

            <AppHeaderActions
              loading={controller.loading}
              readOnly={controller.readOnly}
              onImport={() =>
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
              onExport={() =>
                void api.appConfig.exportSchemes().catch((err: unknown) => {
                  controller.setError((err as Error).message);
                })
              }
              onOpenDefaultApps={() => void api.windows.openDefaultApps()}
              onOpenShare={() => void api.share.open()}
            />
          </Group>
        </AppShell.Header>

        <AppShell.Main style={{ height: '100%', minHeight: 0 }}>
          <Stack gap="md" style={{ minHeight: 0, height: '100%' }}>
            <AppStatusRegion
              loading={controller.loading}
              error={controller.error}
              routeErrorBanner={controller.routeErrorBanner}
              registrationResult={controller.registrationResult}
              warnings={controller.warnings}
              readOnly={controller.readOnly}
              statuses={controller.statuses}
              onClearRegistrationResult={() => {
                controller.setRegistrationResult(null);
              }}
              onOpenDefaultApps={() => void api.windows.openDefaultApps()}
            />

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
                <SettingsTab
                  api={api}
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
                  onRemoveScheme={(schemeToRemove) => {
                    controller.onRemoveScheme(schemeToRemove);
                  }}
                  onAddScheme={(schemeConfig: SchemeConfig) => {
                    controller.onAddScheme(schemeConfig);
                  }}
                  onError={(message) => {
                    controller.setError(message);
                  }}
                  onDidChangeSettings={() => void controller.reload()}
                />
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

      {modalOverlayActive ? (
        <Overlay
          opacity={0.18}
          color="#000"
          zIndex={3000}
          style={{ pointerEvents: 'none' }}
        />
      ) : null}
    </Box>
  );
}
