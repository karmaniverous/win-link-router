/**
 * Requirements addressed:
 * - Settings tab shows SettingsPanel + Schemes sidebar + Scheme editor.
 * - Layout is pinned, with dedicated scroll regions.
 */
import { Group, Stack } from '@mantine/core';

import type {
  AppConfig,
  PresetsFile,
  SchemeConfig,
} from '../../core/config/appConfig';
import type { WinLinkRouterApi } from '../api/winLinkRouterApi';
import { SchemeEditor } from '../components/SchemeEditor';
import { SchemesSidebar } from '../components/SchemesSidebar';
import { SettingsPanel } from '../components/SettingsPanel';

interface StatusLike {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: 'default' | 'not-default' | 'unknown';
  expectedProgId: string;
  actualProgId?: string | null;
}

export function SettingsTab(props: {
  api: WinLinkRouterApi;
  loading: boolean;
  readOnly: boolean;
  config: AppConfig | null;
  presets: PresetsFile | null;
  statuses: StatusLike[];
  selectedScheme: string | null;
  onSelectScheme: (scheme: string) => void;
  onRefreshAndReconcile: () => void;
  onSetNewSchemeDefaults: (patch: {
    autoEnableNewSchemes?: boolean;
    autoRegisterNewSchemes?: boolean;
  }) => void;
  onChangeScheme: (
    next: SchemeConfig,
    opts?: { ensureRegistration?: boolean },
  ) => void;
  onRemoveScheme: (scheme: string) => void;
  onAddScheme: (scheme: SchemeConfig) => void;
  onError: (message: string) => void;
  onDidChangeSettings: () => void;
}) {
  return (
    <Stack gap="sm" style={{ height: '100%', minHeight: 0 }}>
      <SettingsPanel
        api={props.api}
        config={props.config}
        readOnly={props.readOnly}
        onDidChangeSettings={props.onDidChangeSettings}
      />

      <Group
        align="stretch"
        wrap="nowrap"
        gap="md"
        style={{ minHeight: 0, flex: 1 }}
      >
        <div style={{ width: 320, minHeight: 0, display: 'flex' }}>
          <SchemesSidebar
            loading={props.loading}
            readOnly={props.readOnly}
            config={props.config}
            presets={props.presets}
            statuses={props.statuses}
            selectedScheme={props.selectedScheme}
            onSelectScheme={props.onSelectScheme}
            onRefreshAndReconcile={props.onRefreshAndReconcile}
            onSetNewSchemeDefaults={props.onSetNewSchemeDefaults}
            onChangeScheme={props.onChangeScheme}
            onRemoveScheme={props.onRemoveScheme}
            onAddScheme={props.onAddScheme}
            onError={props.onError}
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
              api={props.api}
              presets={props.presets}
              readOnly={props.readOnly}
              scheme={
                props.config?.schemes.find(
                  (s) => s.scheme === props.selectedScheme,
                ) ?? null
              }
              onChangeScheme={props.onChangeScheme}
              onRemoveScheme={props.onRemoveScheme}
            />
          </div>
        </div>
      </Group>
    </Stack>
  );
}
