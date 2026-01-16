/**
 * Requirements addressed:
 * - Maintain a minimal routing log for debugging (persisted per user).
 * - Keep filesystem side effects in main-process code (ports/adapters boundary).
 * - Enforce a simple size cap/retention policy to avoid unbounded growth.
 * - Avoid persisting raw URIs/targets by default (redaction for sensitive data).
 * - Persist both raw and decoded URIs; redact both by default.
 */
import path from 'node:path';

import type { RouteLogMode } from '../../core/config/appConfig';
import type { RouteUriResult } from '../../core/routing/routeUri';
import {
  fileExists,
  readJsonFile,
  writeJsonFileAtomic,
} from '../config/jsonFile';

const REDACTED = '[redacted]';

interface RouteLogEntry {
  seq: number;
  when: string;
  result: RouteUriResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteLogEntry(value: unknown): value is RouteLogEntry {
  if (!isRecord(value)) return false;
  if (typeof value.seq !== 'number') return false;
  if (typeof value.when !== 'string') return false;
  if (!isRecord(value.result)) return false;
  if (typeof value.result.type !== 'string') return false;
  return true;
}

function parseSchemeFromString(value: string): string | null {
  const idx = value.indexOf(':');
  if (idx <= 0) return null;
  return value.slice(0, idx);
}

function redactIncomingUri(uri: string, schemeOverride?: string): string {
  const scheme = schemeOverride ?? parseSchemeFromString(uri) ?? null;
  if (!scheme) return REDACTED;
  return `${scheme.toLowerCase()}:${REDACTED}`;
}

function redactTarget(target: string): string {
  const scheme = parseSchemeFromString(target);
  if (!scheme) return REDACTED;
  return `${scheme.toLowerCase()}:${REDACTED}`;
}

function redactMatchGroups(
  matchGroups: Record<string, string>,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of Object.keys(matchGroups)) {
    out[key] = REDACTED;
  }
  return out;
}

function redactRouteUriResult(result: RouteUriResult): RouteUriResult {
  // Ensure we do not persist raw URIs or rendered targets by default. We keep
  // scheme-level information and errors for debugging.
  const clone = structuredClone(result) as {
    uri?: unknown;
    decodedUri?: unknown;
    scheme?: unknown;
    target?: unknown;
    attempts?: unknown;
    matchGroups?: unknown;
  };

  const schemeOverride =
    typeof clone.scheme === 'string' ? clone.scheme : undefined;

  if (typeof clone.uri === 'string') {
    clone.uri = redactIncomingUri(clone.uri, schemeOverride);
  }

  if (typeof clone.decodedUri === 'string') {
    clone.decodedUri = redactIncomingUri(clone.decodedUri, schemeOverride);
  }

  if (typeof clone.target === 'string') {
    clone.target = redactTarget(clone.target);
  }

  if (Array.isArray(clone.attempts)) {
    for (const attempt of clone.attempts) {
      if (!isRecord(attempt)) continue;
      const renderedTarget = attempt.renderedTarget;
      if (typeof renderedTarget === 'string') {
        attempt.renderedTarget = redactTarget(renderedTarget);
      }
    }
  }

  if (isRecord(clone.matchGroups)) {
    const allStrings = Object.values(clone.matchGroups).every(
      (v) => typeof v === 'string',
    );
    if (allStrings) {
      clone.matchGroups = redactMatchGroups(
        clone.matchGroups as Record<string, string>,
      );
    }
  }

  return clone as unknown as RouteUriResult;
}

function estimateBytes(value: unknown): number {
  // Match writeJsonFileAtomic formatting (2-space indent + trailing newline).
  const text = `${JSON.stringify(value, null, 2)}\n`;
  return Buffer.byteLength(text, 'utf8');
}

function trimEntries(
  entries: RouteLogEntry[],
  maxEntries: number,
  maxBytes: number,
): RouteLogEntry[] {
  const maxEntriesSafe = Math.max(1, maxEntries);
  const maxBytesSafe = Math.max(1, maxBytes);

  let next = entries;

  if (next.length > maxEntriesSafe) {
    next = next.slice(next.length - maxEntriesSafe);
  }

  // Keep at least one entry (even if a single entry exceeds maxBytes).
  while (next.length > 1 && estimateBytes(next) > maxBytesSafe) {
    next = next.slice(1);
  }

  return next;
}

function parseEntries(raw: unknown): RouteLogEntry[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(isRouteLogEntry);
}

export class RouteLogStore {
  private filePath: string;
  private maxEntries: number;
  private maxBytes: number;
  private mode: RouteLogMode;

  constructor(opts: {
    userDataDir: string;
    fileName?: string;
    maxEntries?: number;
    maxBytes?: number;
    mode?: RouteLogMode;
  }) {
    this.filePath = path.join(
      opts.userDataDir,
      opts.fileName ?? 'route-log.json',
    );
    this.maxEntries = opts.maxEntries ?? 200;
    this.maxBytes = opts.maxBytes ?? 512 * 1024;
    this.mode = opts.mode ?? 'redacted';
  }

  setMode(next: RouteLogMode) {
    this.mode = next;
  }

  async read(): Promise<
    { seq: number; when: string; result: RouteUriResult }[]
  > {
    if (!(await fileExists(this.filePath))) return [];
    try {
      const raw = await readJsonFile(this.filePath);
      return parseEntries(raw);
    } catch {
      // Corrupt/unreadable log should not break the app; treat as empty.
      return [];
    }
  }

  async clear(): Promise<void> {
    await writeJsonFileAtomic(this.filePath, []);
  }

  async append(result: RouteUriResult): Promise<void> {
    const current = await this.read();
    const lastSeq = current.length
      ? (current[current.length - 1]?.seq ?? 0)
      : 0;

    const entry: RouteLogEntry = {
      seq: lastSeq + 1,
      when: new Date().toISOString(),
      result: this.mode === 'full' ? result : redactRouteUriResult(result),
    };

    const next = trimEntries(
      [...current, entry],
      this.maxEntries,
      this.maxBytes,
    );

    await writeJsonFileAtomic(this.filePath, next);
  }
}
