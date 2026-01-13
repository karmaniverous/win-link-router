/**
 * Requirements addressed:
 * - Persist nag state in a separate user file (not config) under userData.
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

function parseState(raw: unknown): ShareNagState {
  if (!isRecord(raw)) throw new Error('Invalid share nag state.');
  if (raw.schemaVersion !== 1) throw new Error('Invalid share nag schema.');
  return raw as ShareNagState;
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
