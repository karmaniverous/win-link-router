import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { RouteUriResult } from '../../core/routing/routeUri';
import { RouteLogStore } from './routeLogStore';

async function createTempDir(): Promise<string> {
  return fs.mkdtemp(path.join(os.tmpdir(), 'win-link-router-'));
}

describe('RouteLogStore', () => {
  let tmpDir: string | null = null;

  afterEach(async () => {
    if (!tmpDir) return;
    await fs.rm(tmpDir, { recursive: true, force: true });
    tmpDir = null;
  });

  it('keeps only the last N entries (maxEntries)', async () => {
    tmpDir = await createTempDir();

    const store = new RouteLogStore({
      userDataDir: tmpDir,
      maxEntries: 3,
      maxBytes: 1024 * 1024,
    });

    for (let i = 0; i < 5; i++) {
      const result: RouteUriResult = {
        type: 'noScheme',
        uri: `uri-${String(i)}`,
      };
      await store.append(result);
    }

    const entries = await store.read();
    expect(entries).toHaveLength(3);
    expect(entries[0]?.seq).toBe(3);
    expect(entries[2]?.seq).toBe(5);
  });

  it('trims to fit maxBytes while keeping at least one entry', async () => {
    tmpDir = await createTempDir();

    const store = new RouteLogStore({
      userDataDir: tmpDir,
      maxEntries: 100,
      maxBytes: 1,
    });

    const longUri = `tel:${'1'.repeat(600)}`;
    const result: RouteUriResult = { type: 'noScheme', uri: longUri };

    await store.append(result);
    await store.append(result);
    await store.append(result);

    const entries = await store.read();
    expect(entries.length).toBe(1);
    expect(entries[0]?.seq).toBe(3);
  });

  it('stores raw URIs when mode is full', async () => {
    tmpDir = await createTempDir();

    const store = new RouteLogStore({
      userDataDir: tmpDir,
      mode: 'full',
      maxEntries: 50,
      maxBytes: 1024 * 1024,
    });

    const result: RouteUriResult = {
      type: 'schemeNotConfigured',
      scheme: 'TEL',
      uri: 'tel:+1 (555) 123-4567',
    };

    await store.append(result);
    const entries = await store.read();
    expect(entries[0]?.result.uri).toBe('tel:+1 (555) 123-4567');
  });
});
