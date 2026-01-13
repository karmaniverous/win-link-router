/**
 * Requirements addressed:
 * - Persist nag state in a separate user file (not config) under userData.
 * - Validate persisted state safely; fall back to defaults if malformed.
 * - Only successful routes count toward nag frequency.
 * - Manual share uses MRU (most recently used) scheme + template label.
 */
import path from 'node:path';

import {
  fileExists,
  readJsonFile,
  writeJsonFileAtomic,
} from '../config/jsonFile';
import { NAG_STATE_FILE } from './shareNagConstants';

export interface ShareNagState {
  schemaVersion: 1;
  disabled: boolean;
  successfulRouteCount: number;
  lastSuccessful?: {
    scheme: string;
    templateLabel: string;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isShareNagState(value: unknown): value is ShareNagState {
  if (!isRecord(value)) return false;
  if (value.schemaVersion !== 1) return false;
  if (typeof value.disabled !== 'boolean') return false;
  if (typeof value.successfulRouteCount !== 'number') return false;

  const last = value.lastSuccessful;
  if (last === undefined) return true;
  if (!isRecord(last)) return false;
  if (typeof last.scheme !== 'string') return false;
  if (typeof last.templateLabel !== 'string') return false;
  return true;
}

function parseState(raw: unknown): ShareNagState {
  if (!isShareNagState(raw)) {
    throw new Error('Invalid share nag state.');
  }
  return raw;
}

export class ShareNagStateStore {
  private filePath: string;

  constructor(opts: { userDataDir: string; fileName?: string }) {
    this.filePath = path.join(
      opts.userDataDir,
      opts.fileName ?? NAG_STATE_FILE,
    );
  }

  async read(): Promise<ShareNagState> {
    if (!(await fileExists(this.filePath))) {
      return { schemaVersion: 1, disabled: false, successfulRouteCount: 0 };
    }
    try {
      return parseState(await readJsonFile(this.filePath));
    } catch {
      return { schemaVersion: 1, disabled: false, successfulRouteCount: 0 };
    }
  }

  async write(next: ShareNagState): Promise<void> {
    await writeJsonFileAtomic(this.filePath, next);
  }

  async setDisabled(disabled: boolean): Promise<void> {
    const current = await this.read();
    await this.write({ ...current, disabled });
  }
}
