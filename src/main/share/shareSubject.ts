/**
 * Requirements addressed:
 * - Manual share uses MRU; fallback to enabled schemes/templates, then disabled.
 * - Nag share uses the link that triggered the nag (scheme + actual routed template label).
 * - Target is derived from template label (e.g., "WhatsApp Desktop").
 */
import type { AppConfig, SchemeConfig } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';

export interface ShareSubject {
  scheme: string;
  templateLabel: string;
}

function pickTemplateLabel(scheme: SchemeConfig): string | null {
  const enabled = scheme.templates.find((t) => t.enabled);
  if (enabled) return enabled.label;
  return scheme.templates[0]?.label ?? null;
}

function pickScheme(config: AppConfig): SchemeConfig | null {
  const enabledWithTemplates =
    config.schemes.find(
      (s) => s.enabled && s.templates.some((t) => t.enabled),
    ) ??
    config.schemes.find((s) => s.enabled && s.templates.length > 0) ??
    config.schemes.find((s) => s.enabled) ??
    null;
  if (enabledWithTemplates) return enabledWithTemplates;
  return config.schemes[0] ?? null;
}

export function deriveShareSubjectFromConfig(
  config: AppConfig,
): ShareSubject | null {
  const scheme = pickScheme(config);
  if (!scheme) return null;
  const label = pickTemplateLabel(scheme);
  if (!label) return null;
  return { scheme: scheme.scheme, templateLabel: label };
}

export function deriveShareSubjectFromRouteResult(
  result: RouteUriResult,
): ShareSubject | null {
  if (result.type !== 'routed') return null;

  const attempts = result.attempts;
  const attempt =
    attempts.find((a) => a.templateId === result.templateId) ?? attempts.at(-1);
  const label = attempt?.label;
  if (!label) return null;

  return {
    scheme: result.scheme.toUpperCase(),
    templateLabel: label,
  };
}
