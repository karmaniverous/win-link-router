/**
 * Requirements addressed:
 * - When routing fails, the UI must surface an actionable error banner and
 *   prefill the Test panel with the failing URI.
 * - Keep logic pure/testable in the renderer (no Electron side effects).
 */
import type { RouteUriResult } from '../../core/routing/routeUri';

function parseSchemeFromUri(uri: string): string | null {
  const idx = uri.indexOf(':');
  if (idx <= 0) return null;
  return uri.slice(0, idx);
}

export function inferSchemeForRouteFailure(opts: {
  uri: string;
  result: RouteUriResult;
}): string | null {
  const scheme = (opts.result as { scheme?: unknown }).scheme;
  if (typeof scheme === 'string' && scheme) return scheme.toUpperCase();
  const fromUri = parseSchemeFromUri(opts.uri);
  return fromUri ? fromUri.toUpperCase() : null;
}

export function formatRouteFailureBanner(
  result: RouteUriResult,
): string | null {
  switch (result.type) {
    case 'routed':
      return null;
    case 'noScheme':
      return 'Routing failed: invalid URI (missing scheme).';
    case 'schemeNotConfigured':
      return `Routing failed: no routing configured for ${result.scheme}.`;
    case 'schemeDisabled':
      return `Routing failed: ${result.scheme} is disabled.`;
    case 'extractorNoMatch':
      return `Routing failed: extractor did not match for ${result.scheme}.`;
    case 'noEnabledTemplates':
      return `Routing failed: no enabled templates for ${result.scheme}.`;
    case 'templateRenderError':
      return `Routing failed: template ${result.templateId} render error (${result.scheme}).`;
    case 'openFailed':
      return `Routing failed: could not open any target (${result.scheme}).`;
    default: {
      const exhaustive: never = result;
      return `Routing failed: ${(exhaustive as { type?: unknown }).type ?? 'unknown'}.`;
    }
  }
}
