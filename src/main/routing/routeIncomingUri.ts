/**
 * Requirements addressed:
 * - Route protocol URIs without showing the window by default.
 * - openExternal failures try next template; render failures stop.
 * - Scheme selection uses user configuration.
 */
import { shell } from 'electron';

import { findSchemeConfig } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';
import { routeUriOrFail } from '../../core/routing/routeUri';
import type { TemplateRenderer } from '../../core/routing/templateRenderer';
import type { AppConfigStore } from '../config/appConfigStore';

export async function routeIncomingUri(
  configStore: AppConfigStore,
  renderer: TemplateRenderer,
  uri: string,
): Promise<RouteUriResult> {
  const config = configStore.getLoadedConfig();

  let schemeConfig;
  try {
    const scheme = uri.split(':', 1)[0] ?? '';
    schemeConfig = findSchemeConfig(config, scheme);
  } catch {
    schemeConfig = undefined;
  }

  return routeUriOrFail(
    renderer,
    { openExternal: (url) => shell.openExternal(url) },
    uri,
    schemeConfig,
  );
}
