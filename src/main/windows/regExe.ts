/**
 * Requirements addressed:
 * - Windows integration must be robust and based on registry state.
 * - Keep side effects behind a thin adapter (ports & adapters).
 * - Support querying merged class roots (HKCR) and reading (Default) values.
 * - Support deleting key trees for per-scheme deregistration cleanup.
 */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

type RegistryHive = 'HKCU' | 'HKCR';
type WritableRegistryHive = 'HKCU';
type RegistryValueType = 'REG_SZ';

function hiveKey(hive: RegistryHive, key: string): string {
  // reg.exe expects e.g. HKCU\Software\...
  return `${hive}\\${key}`;
}

export async function regSetValue(opts: {
  hive: WritableRegistryHive;
  key: string;
  name: string | null; // null = (Default)
  type: RegistryValueType;
  data: string;
}): Promise<void> {
  const fullKey = hiveKey(opts.hive, opts.key);

  const args: string[] = ['add', fullKey, '/t', opts.type, '/f'];
  if (opts.name === null) {
    args.push('/ve');
  } else {
    args.push('/v', opts.name);
  }
  args.push('/d', opts.data);

  await execFileAsync('reg.exe', args, { windowsHide: true });
}

export async function regDeleteKey(opts: {
  hive: WritableRegistryHive;
  key: string;
}): Promise<void> {
  const fullKey = hiveKey(opts.hive, opts.key);
  await execFileAsync('reg.exe', ['delete', fullKey, '/f'], {
    windowsHide: true,
  });
}

export async function regDeleteValue(opts: {
  hive: WritableRegistryHive;
  key: string;
  name: string;
}): Promise<void> {
  const fullKey = hiveKey(opts.hive, opts.key);
  await execFileAsync('reg.exe', ['delete', fullKey, '/v', opts.name, '/f'], {
    windowsHide: true,
  });
}

export async function regQueryValue(opts: {
  hive: RegistryHive;
  key: string;
  name: string | null; // null = (Default)
}): Promise<string | null> {
  const fullKey = hiveKey(opts.hive, opts.key);
  try {
    const args =
      opts.name === null
        ? ['query', fullKey, '/ve']
        : ['query', fullKey, '/v', opts.name];

    const { stdout } = await execFileAsync('reg.exe', args, {
      windowsHide: true,
    });

    try {
      return parseRegQuerySingleValue(stdout, opts.name);
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

export async function regListValues(opts: {
  hive: RegistryHive;
  key: string;
}): Promise<Record<string, string>> {
  const fullKey = hiveKey(opts.hive, opts.key);
  try {
    const { stdout } = await execFileAsync('reg.exe', ['query', fullKey], {
      windowsHide: true,
    });
    return parseRegQueryValues(stdout);
  } catch {
    return {};
  }
}

function parseRegQuerySingleValue(
  stdout: string,
  valueName: string | null,
): string {
  const desiredName = valueName ?? '(Default)';
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Typical: <name>    REG_SZ    <data>
    const match = /^(.+?)\s+REG_\w+\s+(.*)$/.exec(trimmed);
    if (!match) continue;

    const name = match[1].trim();
    if (name !== desiredName) continue;

    return match[2].trim();
  }

  throw new Error(`Value "${desiredName}" not found in reg query output.`);
}

function parseRegQueryValues(stdout: string): Record<string, string> {
  const out: Record<string, string> = {};
  const lines = stdout.split(/\r?\n/);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith('HKEY_') || trimmed.startsWith('HKCU\\')) continue;

    const match = /^(.+?)\s+REG_\w+\s+(.*)$/.exec(trimmed);
    if (!match) continue;

    const name = match[1].trim();
    const data = match[2].trim();
    if (!name || name === '(Default)') continue;
    out[name] = data;
  }

  return out;
}
