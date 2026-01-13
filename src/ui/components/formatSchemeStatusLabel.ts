/**
 * Requirements addressed:
 * - Scheme list labels should not include status text; icons/tooltip cover it.
 */
export function formatSchemeStatusLabel(opts: {
  scheme: string;
  enabled: boolean;
  status?: unknown;
}): string {
  void opts.enabled;
  void opts.status;
  return opts.scheme;
}
