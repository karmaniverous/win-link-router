/**
 * Requirements addressed:
 * - When routing fails, the app opens the UI and pre-fills the test input with
 *   the failing URI.
 *
 * Implementation note:
 * - Main process holds the last routing failure in memory so the renderer can
 *   fetch it on startup. This avoids timing issues with events during window
 *   creation.
 */
import type { RouteUriResult } from '../../core/routing/routeUri';

export interface LastRouteError {
  when: string;
  uri: string;
  result: RouteUriResult;
}

let lastRouteError: LastRouteError | null = null;

export function setLastRouteError(next: LastRouteError) {
  lastRouteError = next;
}

export function getLastRouteError(): LastRouteError | null {
  return lastRouteError;
}

export function clearLastRouteError() {
  lastRouteError = null;
}
