import type { SchemeConfig } from '../core/config/appConfig';
import { getWinLinkRouterApi } from './api/winLinkRouterApi';
import { useAppController } from './app/useAppController';
import { APP_TABS } from './app/useAppController';
import { RouteLogPanel } from './components/RouteLogPanel';
import { SchemeEditor } from './components/SchemeEditor';
import { SchemesSidebar } from './components/SchemesSidebar';
import { SettingsPanel } from './components/SettingsPanel';
import { Spinner } from './components/Spinner';
import { Tabs } from './components/Tabs';
import { TestPanel } from './components/TestPanel';

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

  return (
    <main className="appShell">
      <header className="topbar">
        <h1>win-link-router</h1>
        <div className="topbarActions">
          <button
            type="button"
            onClick={() =>
              void api.appConfig.importSchemes().then(controller.reload)
            }
          >
            Import
          </button>
          <button
            type="button"
            onClick={() => void api.appConfig.exportSchemes()}
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => void api.windows.openDefaultApps()}
          >
            Default Apps…
          </button>
          <button
            type="button"
            onClick={() =>
              void api.windows
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
                })
            }
          >
            Ensure Registration
          </button>
        </div>
      </header>

      <div className="appBanners" role="region" aria-label="Status">
        {controller.loading ? <Spinner label="Loading…" /> : null}
        {controller.error ? <p className="error">{controller.error}</p> : null}
        {controller.routeErrorBanner ? (
          <p className="error">{controller.routeErrorBanner}</p>
        ) : null}
        {controller.registrationResult ? (
          <section className="panel">
            <div className="row">
              <strong>
                Registration{' '}
                {controller.registrationResult.kind === 'ok'
                  ? 'updated'
                  : 'warning'}
              </strong>
              <div className="rowActions">
                <button
                  type="button"
                  onClick={() => {
                    controller.setRegistrationResult(null);
                  }}
                >
                  Dismiss
                </button>
              </div>
            </div>
            <pre
              className={
                controller.registrationResult.kind === 'ok'
                  ? 'muted'
                  : 'warning'
              }
            >
              {controller.registrationResult.message}
            </pre>
          </section>
        ) : null}
        {controller.warnings.length ? (
          <details>
            <summary>Warnings</summary>
            <pre>{controller.warnings.join('\n')}</pre>
          </details>
        ) : null}
        {controller.readOnly ? (
          <p className="warning">
            Config is read-only (shared config error). Settings can still be
            updated to fix the shared config path.
          </p>
        ) : null}
      </div>

      <div className="appBody">
        <SchemesSidebar
          loading={controller.loading}
          readOnly={controller.readOnly}
          config={controller.config}
          presets={controller.presets}
          statuses={controller.statuses}
          selectedScheme={controller.selectedScheme}
          onSelectScheme={controller.setSelectedScheme}
          onError={(message) => {
            controller.setError(message);
          }}
          onAddScheme={(schemeConfig: SchemeConfig) => {
            controller.onAddScheme(schemeConfig);
          }}
        />

        <section className="contentColumn">
          <Tabs
            value={controller.activeTab}
            onChange={(next) => {
              controller.setActiveTab(next);
            }}
            tabs={APP_TABS}
          />

          <div className="contentScroll">
            <div className="tabPanel" role="region" aria-label="Tab panel">
              {controller.activeTab === 'settings' ? (
                <SettingsPanel
                  api={api}
                  config={controller.config}
                  readOnly={controller.readOnly}
                  onDidChangeSettings={() => void controller.reload()}
                />
              ) : null}
              {controller.activeTab === 'log' ? (
                <RouteLogPanel api={api} />
              ) : null}
              {controller.activeTab === 'test' ? (
                <TestPanel
                  api={api}
                  scheme={controller.selectedScheme}
                  testUri={controller.testUri}
                  onChangeTestUri={controller.setTestUri}
                />
              ) : null}
            </div>

            <div className="editorPanel">
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
        </section>
      </div>
    </main>
  );
}
