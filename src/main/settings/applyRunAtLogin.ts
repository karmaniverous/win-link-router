/**
 * Requirements addressed:
 * - “Run at login” is configurable per user and wired to Electron.
 */
import { app } from 'electron';

import type { AppConfig } from '../../core/config/appConfig';

export function applyRunAtLoginSetting(config: AppConfig) {
  app.setLoginItemSettings({
    openAtLogin: config.settings.runAtLogin,
  });
}
