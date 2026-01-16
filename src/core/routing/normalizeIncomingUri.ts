/**
 * Requirements addressed:
 * - Normalize incoming URIs regardless of source:
 *   - Preserve the original raw URI for logging/diagnostics.
 *   - Compute a decoded URI used for extractor matching and template context.
 * - Decoding behavior:
 *   - Decode only the URI payload (everything after the first ':') so the
 *     scheme boundary remains stable.
 *   - Use a tolerant decoder so malformed percent sequences do not crash the app.
 */
import decodeUriComponent from 'decode-uri-component';

export interface NormalizedIncomingUri {
  rawUri: string;
  decodedUri: string;
}

export function normalizeIncomingUri(rawUri: string): NormalizedIncomingUri {
  const idx = rawUri.indexOf(':');
  if (idx <= 0) {
    return { rawUri, decodedUri: rawUri };
  }

  const schemePlusColon = rawUri.slice(0, idx + 1);
  const rest = rawUri.slice(idx + 1);

  let decodedRest = rest;
  try {
    decodedRest = decodeUriComponent(rest);
  } catch {
    // Best-effort only: keep the raw payload if decoding fails.
    decodedRest = rest;
  }

  return {
    rawUri,
    decodedUri: `${schemePlusColon}${decodedRest}`,
  };
}
