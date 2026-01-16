/**
 * Requirements addressed:
 * - Determine scheme from the incoming URI and route using per-scheme config.
 * - Apply a single extractor regex per scheme to produce named capture groups.
 * - Normalize incoming URIs before extraction:
 *   - Preserve `uri` (raw) for logging/diagnostics.
 *   - Compute `decodedUri` by decoding only the payload after the first ':'.
 *   - Run extractor matching against `decodedUri` (not `uri`).
 * - Template context includes:
 *   - top-level capture groups,
 *   - `uri` (raw),
 *   - `decodedUri`,
 *   - `match` (from extractor exec against decodedUri).
 * - Render failures are configuration errors (open UI; do not fallback).
 * - openExternal failures attempt next enabled template (best-effort fallback).
 * - Route results include extractor match groups for diagnostics/logging.
 * - Test evaluation is available for UI: show per-template rendered output or
 *   render error for a given test URI.
 */
import type { SchemeConfig, TemplateConfig } from '../config/appConfig';
import { normalizeIncomingUri } from './normalizeIncomingUri';
import type { TemplateRenderer } from './templateRenderer';

export interface OpenExternalPort {
  openExternal(url: string): Promise<void>;
}

interface TemplateAttempt {
  templateId: string;
  label: string;
  renderedTarget?: string;
  openError?: string;
}

export type RouteUriResult =
  | { type: 'noScheme'; uri: string; decodedUri: string }
  | {
      type: 'schemeNotConfigured';
      scheme: string;
      uri: string;
      decodedUri: string;
    }
  | { type: 'schemeDisabled'; scheme: string; uri: string; decodedUri: string }
  | {
      type: 'extractorNoMatch';
      scheme: string;
      uri: string;
      decodedUri: string;
    }
  | {
      type: 'noEnabledTemplates';
      scheme: string;
      uri: string;
      decodedUri: string;
      matchGroups?: Record<string, string>;
    }
  | {
      type: 'templateRenderError';
      scheme: string;
      uri: string;
      decodedUri: string;
      templateId: string;
      message: string;
      attempts: TemplateAttempt[];
      matchGroups?: Record<string, string>;
    }
  | {
      type: 'openFailed';
      scheme: string;
      uri: string;
      decodedUri: string;
      attempts: TemplateAttempt[];
      matchGroups?: Record<string, string>;
    }
  | {
      type: 'routed';
      scheme: string;
      uri: string;
      decodedUri: string;
      target: string;
      templateId: string;
      attempts: TemplateAttempt[];
      matchGroups?: Record<string, string>;
    };

export interface TemplateEvaluation {
  templateId: string;
  label: string;
  enabled: boolean;
  renderedTarget?: string;
  renderError?: string;
}

function parseSchemeFromUri(uri: string): string | null {
  const idx = uri.indexOf(':');
  if (idx <= 0) return null;
  return uri.slice(0, idx);
}

function buildExtractor(schemeConfig: SchemeConfig): RegExp {
  const flags = schemeConfig.extractor.flags ?? '';
  return new RegExp(schemeConfig.extractor.pattern, flags);
}

function buildTemplateContext(
  rawUri: string,
  decodedUri: string,
  match: RegExpExecArray,
): Record<string, unknown> {
  const groups = match.groups ?? {};
  return {
    ...groups,
    uri: rawUri,
    decodedUri,
    match,
  };
}

function enabledTemplates(schemeConfig: SchemeConfig): TemplateConfig[] {
  return schemeConfig.templates.filter((t) => t.enabled);
}

export function evaluateTemplatesForTest(
  renderer: TemplateRenderer,
  uri: string,
  schemeConfig: SchemeConfig,
): { match: RegExpExecArray | null; evaluations: TemplateEvaluation[] } {
  const normalized = normalizeIncomingUri(uri);

  const extractor = buildExtractor(schemeConfig);
  const match = extractor.exec(normalized.decodedUri);

  const evaluations = schemeConfig.templates.map((t) => {
    if (!match) {
      return {
        templateId: t.id,
        label: t.label,
        enabled: t.enabled,
        renderError: 'Extractor did not match the provided URI.',
      };
    }

    const context = buildTemplateContext(uri, normalized.decodedUri, match);
    try {
      const renderedTarget = renderer.render(t.template, context);
      return {
        templateId: t.id,
        label: t.label,
        enabled: t.enabled,
        renderedTarget,
      };
    } catch (err) {
      return {
        templateId: t.id,
        label: t.label,
        enabled: t.enabled,
        renderError: (err as Error).message,
      };
    }
  });

  return { match, evaluations };
}

export async function routeUriWithSchemeConfig(
  renderer: TemplateRenderer,
  openExternalPort: OpenExternalPort,
  uri: string,
  schemeConfig: SchemeConfig,
): Promise<RouteUriResult> {
  const normalized = normalizeIncomingUri(uri);

  if (!schemeConfig.enabled) {
    return {
      type: 'schemeDisabled',
      scheme: schemeConfig.scheme,
      uri,
      decodedUri: normalized.decodedUri,
    };
  }

  const extractor = buildExtractor(schemeConfig);
  const match = extractor.exec(normalized.decodedUri);
  if (!match) {
    return {
      type: 'extractorNoMatch',
      scheme: schemeConfig.scheme,
      uri,
      decodedUri: normalized.decodedUri,
    };
  }
  const matchGroups = match.groups ? { ...match.groups } : undefined;

  const templates = enabledTemplates(schemeConfig);
  if (!templates.length) {
    return {
      type: 'noEnabledTemplates',
      scheme: schemeConfig.scheme,
      uri,
      decodedUri: normalized.decodedUri,
      matchGroups,
    };
  }

  const context = buildTemplateContext(uri, normalized.decodedUri, match);

  const attempts: TemplateAttempt[] = [];

  for (const t of templates) {
    let target: string;
    try {
      target = renderer.render(t.template, context);
    } catch (err) {
      return {
        type: 'templateRenderError',
        scheme: schemeConfig.scheme,
        uri,
        decodedUri: normalized.decodedUri,
        templateId: t.id,
        message: (err as Error).message,
        attempts,
        matchGroups,
      };
    }

    try {
      await openExternalPort.openExternal(target);
      attempts.push({
        templateId: t.id,
        label: t.label,
        renderedTarget: target,
      });
      return {
        type: 'routed',
        scheme: schemeConfig.scheme,
        uri,
        decodedUri: normalized.decodedUri,
        target,
        templateId: t.id,
        attempts,
        matchGroups,
      };
    } catch (err) {
      attempts.push({
        templateId: t.id,
        label: t.label,
        renderedTarget: target,
        openError: (err as Error).message,
      });
    }
  }

  return {
    type: 'openFailed',
    scheme: schemeConfig.scheme,
    uri,
    decodedUri: normalized.decodedUri,
    attempts,
    matchGroups,
  };
}

export async function routeUriOrFail(
  renderer: TemplateRenderer,
  openExternalPort: OpenExternalPort,
  uri: string,
  schemeConfig: SchemeConfig | undefined,
): Promise<RouteUriResult> {
  const scheme = parseSchemeFromUri(uri);
  const normalized = normalizeIncomingUri(uri);

  if (!scheme) {
    return { type: 'noScheme', uri, decodedUri: normalized.decodedUri };
  }

  if (!schemeConfig) {
    return {
      type: 'schemeNotConfigured',
      scheme,
      uri,
      decodedUri: normalized.decodedUri,
    };
  }

  return routeUriWithSchemeConfig(
    renderer,
    openExternalPort,
    uri,
    schemeConfig,
  );
}
