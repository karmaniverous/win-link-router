/**
 * Requirements addressed:
 * - Maintain a minimal routing log for debugging (persisted per user).
 * - Keep filesystem side effects in main-process code (ports/adapters boundary).
 * - Enforce a simple size cap/retention policy to avoid unbounded growth.
 */
import path from 'node:path';

import type { RouteUriResult } from '../../core/routing/routeUri';
import {
  fileExists,
  readJsonFile,
  writeJsonFileAtomic,
} from '../config/jsonFile';

interface RouteLogEntry {
  when: string;
  result: RouteUriResult;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteLogEntry(value: unknown): value is RouteLogEntry {
  if (!isRecord(value)) return false;
  if (typeof value.when !== 'string') return false;
  if (!isRecord(value.result)) return false;
  if (typeof value.result.type !== 'string') return false;
  return true;
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

  constructor(opts: {
    userDataDir: string;
    fileName?: string;
    maxEntries?: number;
    maxBytes?: number;
  }) {
    this.filePath = path.join(
      opts.userDataDir,
      opts.fileName ?? 'route-log.json',
    );
    this.maxEntries = opts.maxEntries ?? 200;
    this.maxBytes = opts.maxBytes ?? 512 * 1024;
  }

  async read(): Promise<{ when: string; result: RouteUriResult }[]> {
    if (!(await fileExists(this.filePath))) return [];
    try {
      const raw = await readJsonFile(this.filePath);
      return parseEntries(raw);
    } catch {
      // Corrupt/unreadable log should not break the app; treat as empty.
      return [];
    }
  }

  async append(result: RouteUriResult): Promise<void> {
    const entry: RouteLogEntry = {
      when: new Date().toISOString(),
      result,
    };

    const current = await this.read();
    const next = trimEntries(
      [...current, entry],
      this.maxEntries,
      this.maxBytes,
    );

    await writeJsonFileAtomic(this.filePath, next);
  }
}
