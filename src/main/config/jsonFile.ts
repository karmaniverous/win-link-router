/**
 * Requirements addressed:
 * - JSON persistence helpers used by config store and import/export.
 */
import { constants as fsConstants } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';

export async function fileExists(filePath: string): Promise<boolean> {
  try {
    await fs.access(filePath, fsConstants.F_OK);
    return true;
  } catch {
    return false;
  }
}

export async function readJsonFile(filePath: string): Promise<unknown> {
  const text = await fs.readFile(filePath, 'utf8');
  return JSON.parse(text) as unknown;
}

export async function writeJsonFileAtomic(
  filePath: string,
  value: unknown,
): Promise<void> {
  const dir = path.dirname(filePath);
  await fs.mkdir(dir, { recursive: true });

  const tmpPath = `${filePath}.tmp-${String(process.pid)}-${String(Date.now())}`;
  const text = `${JSON.stringify(value, null, 2)}\n`;
  await fs.writeFile(tmpPath, text, 'utf8');

  try {
    await fs.rename(tmpPath, filePath);
  } catch {
    // Best-effort fallback for Windows rename semantics.
    await fs.copyFile(tmpPath, filePath);
    await fs.rm(tmpPath, { force: true });
  }
}

export function toErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return String(err);
}
