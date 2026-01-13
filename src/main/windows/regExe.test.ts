import { describe, expect, it, vi } from 'vitest';

const execFileMock = vi.fn(
  (file: unknown, args: unknown, optsOrCb: unknown, cbMaybe?: unknown) => {
    const cb =
      typeof optsOrCb === 'function'
        ? (optsOrCb as (err: unknown, stdout: string, stderr: string) => void)
        : (cbMaybe as (err: unknown, stdout: string, stderr: string) => void);
    if (typeof cb === 'function') cb(null, '', '');
    void file;
    void args;
    return;
  },
);

vi.mock('node:child_process', () => {
  return {
    execFile: execFileMock,
  };
});

describe('regExe', () => {
  it('regDeleteKey uses reg.exe delete <key> /f', async () => {
    const { regDeleteKey } = await import('./regExe');
    await regDeleteKey({ hive: 'HKCU', key: 'Software\\Classes\\x' });

    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0]?.[0]).toBe('reg.exe');
    expect(execFileMock.mock.calls[0]?.[1]).toEqual([
      'delete',
      'HKCU\\Software\\Classes\\x',
      '/f',
    ]);
  });

  it('regDeleteValue uses reg.exe delete <key> /v <name> /f', async () => {
    const { regDeleteValue } = await import('./regExe');
    await regDeleteValue({
      hive: 'HKCU',
      key: 'Software\\RegisteredApplications',
      name: 'win-link-router',
    });

    expect(execFileMock).toHaveBeenCalledTimes(1);
    expect(execFileMock.mock.calls[0]?.[0]).toBe('reg.exe');
    expect(execFileMock.mock.calls[0]?.[1]).toEqual([
      'delete',
      'HKCU\\Software\\RegisteredApplications',
      '/v',
      'win-link-router',
      '/f',
    ]);
  });
});
