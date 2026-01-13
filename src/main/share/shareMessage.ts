/**
 * Requirements addressed:
 * - Share message includes scheme (link type) and target derived from template label.
 * - X share mentions @karmaniverous.
 */
import { REPO_URL } from './shareNagConstants';

export function formatShareMessage(opts: {
  scheme: string;
  templateLabel: string;
}): string {
  const scheme = opts.scheme.trim().toUpperCase() || 'LINK';
  const label = opts.templateLabel.trim() || 'a configured app';
  return `I'm routing ${scheme} links to ${label} on Windows with win-link-router! ${REPO_URL}`;
}

export function formatXShareText(opts: {
  scheme: string;
  templateLabel: string;
}): string {
  return `${formatShareMessage(opts)} @karmaniverous`;
}
