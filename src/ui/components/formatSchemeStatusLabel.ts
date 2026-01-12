/**
 * Requirements addressed:
 * - The scheme list should show clear indicators for default-handler status and
 *   registration status (read-only).
 */
type DefaultStatus = 'default' | 'not-default' | 'unknown';

export function formatSchemeStatusLabel(opts: {
  scheme: string;
  enabled: boolean;
  status?: { registered: boolean; defaultStatus: DefaultStatus } | null;
}): string {
  const parts: string[] = [];

  if (!opts.enabled) parts.push('disabled');

  const defaultStatus = opts.status?.defaultStatus ?? 'unknown';
  const registered = opts.status?.registered;

  if (defaultStatus === 'default') parts.push('Default');
  else if (defaultStatus === 'not-default') parts.push('Not default');
  else parts.push('Default unknown');

  if (registered === true) parts.push('Registered');
  else if (registered === false) parts.push('Not registered');
  else parts.push('Registration unknown');

  return `${opts.scheme} — ${parts.join(', ')}`;
}
