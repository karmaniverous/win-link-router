/**
 * Requirements addressed:
 * - Determine scheme from the incoming URI and route using per-scheme config.
 * - Apply a single extractor regex per scheme to produce named capture groups.
 * - Template context includes top-level capture groups + `uri` + `match`.
 * - Render failures are configuration errors (open UI; do not fallback).
 * - openExternal failures attempt next enabled template (best-effort fallback).
 * - Test evaluation is available for UI: show per-template rendered output or
 *   render error for a given test URI.
 */
import type { SchemeConfig, TemplateConfig } from '../config/appConfig';
import type { TemplateRenderer } from './templateRenderer';

export interface OpenExternalPort {
  openExternal(url: string): Promise<void>;
}

export interface TemplateAttempt {
  templateId: string;
  label: string;
  renderedTarget?: string;
  openError?: string;
}

export type RouteUriResult =
  | { type: 'noScheme'; uri: string }
  | { type: 'schemeDisabled'; scheme: string; uri: string }
  | { type: 'extractorNoMatch'; scheme: string; uri: string }
  | { type: 'noEnabledTemplates'; scheme: string; uri: string }
  | {
      type: 'templateRenderError';
      scheme: string;
      uri: string;
      templateId: string;
      message: string;
      attempts: TemplateAttempt[];
    }
  | {
      type: 'openFailed';
      scheme: string;
      uri: string;
      attempts: TemplateAttempt[];
    }
  | {
      type: 'routed';
      scheme: string;
      uri: string;
      target: string;
      templateId: string;
      attempts: TemplateAttempt[];
    };

export interface TemplateEvaluation {
  templateId: string;
  label: string;
  enabled: boolean;
  renderedTarget?: string;
  renderError?: string;
}

export function parseSchemeFromUri(uri: string): string | null {
  const idx = uri.indexOf(':');
  if (idx <= 0) return null;
  return uri.slice(0, idx);
}

function buildExtractor(schemeConfig: SchemeConfig): RegExp {
  const flags = schemeConfig.extractor.flags ?? '';
  return new RegExp(schemeConfig.extractor.pattern, flags);
}

function buildTemplateContext(
  uri: string,
  match: RegExpExecArray,
): Record<string, unknown> {
  const groups = match.groups ?? {};
  return {
    ...groups,
    uri,
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
  const extractor = buildExtractor(schemeConfig);
  const match = extractor.exec(uri);

  const evaluations = schemeConfig.templates.map((t) => {
    if (!match) {
      return {
        templateId: t.id,
        label: t.label,
        enabled: t.enabled,
        renderError: 'Extractor did not match the provided URI.',
      };
    }

    const context = buildTemplateContext(uri, match);
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
  if (!schemeConfig.enabled) {
    return { type: 'schemeDisabled', scheme: schemeConfig.scheme, uri };
  }

  const extractor = buildExtractor(schemeConfig);
  const match = extractor.exec(uri);
  if (!match) {
    return { type: 'extractorNoMatch', scheme: schemeConfig.scheme, uri };
  }

  const templates = enabledTemplates(schemeConfig);
  if (!templates.length) {
    return { type: 'noEnabledTemplates', scheme: schemeConfig.scheme, uri };
  }

  const context = buildTemplateContext(uri, match);

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
        templateId: t.id,
        message: (err as Error).message,
        attempts,
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
        target,
        templateId: t.id,
        attempts,
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

  return { type: 'openFailed', scheme: schemeConfig.scheme, uri, attempts };
}

export async function routeUriOrFail(
  renderer: TemplateRenderer,
  openExternalPort: OpenExternalPort,
  uri: string,
  schemeConfig: SchemeConfig | undefined,
): Promise<RouteUriResult> {
  const scheme = parseSchemeFromUri(uri);
  if (!scheme) return { type: 'noScheme', uri };

  if (!schemeConfig) {
    // Selection is handled by the caller (AppConfig lookup). This is still a
    // useful wrapper for CLI/tests.
    return { type: 'schemeDisabled', scheme, uri };
  }

  return routeUriWithSchemeConfig(
    renderer,
    openExternalPort,
    uri,
    schemeConfig,
  );
}
