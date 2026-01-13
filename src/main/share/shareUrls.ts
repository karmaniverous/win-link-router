/**
 * Requirements addressed:
 * - X/LinkedIn share buttons share the repo URL with a message.
 * - LinkedIn uses best-effort legacy params.
 */
import { formatShareMessage, formatXShareText } from './shareMessage';
import { REPO_URL } from './shareNagConstants';

export type SharePlatform = 'x' | 'linkedin';

export function buildShareUrl(opts: {
  platform: SharePlatform;
  scheme: string;
  templateLabel: string;
}): string {
  if (opts.platform === 'x') {
    const text = formatXShareText(opts);
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }

  const summary = formatShareMessage(opts);
  const title = 'win-link-router';

  // Best-effort legacy params; LinkedIn may ignore summary/title depending on
  // account/session/product behavior.
  return [
    'https://www.linkedin.com/shareArticle?mini=true',
    `url=${encodeURIComponent(REPO_URL)}`,
    `title=${encodeURIComponent(title)}`,
    `summary=${encodeURIComponent(summary)}`,
    `source=${encodeURIComponent(REPO_URL)}`,
  ].join('&');
}
