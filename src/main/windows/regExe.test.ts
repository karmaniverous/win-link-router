import { describe, expect, it, vi } from 'vitest';

const execFileAsync = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

vi.mock('node:child_process', () => {
  return {
    execFile: (...args: unknown[]) => execFileAsync(...args),
  };
});

describe('regExe', () => {
  it('regDeleteKey uses reg.exe delete <key> /f', async () => {
    const { regDeleteKey } = await import('./regExe');
    await regDeleteKey({ hive: 'HKCU', key: 'Software\\Classes\\x' });

    expect(execFileAsync).toHaveBeenCalledTimes(1);
    expect(execFileAsync.mock.calls[0]?.[0]).toBe('reg.exe');
    expect(execFileAsync.mock.calls[0]?.[1]).toEqual([
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

    expect(execFileAsync).toHaveBeenCalledTimes(1);
    expect(execFileAsync.mock.calls[0]?.[0]).toBe('reg.exe');
    expect(execFileAsync.mock.calls[0]?.[1]).toEqual([
      'delete',
      'HKCU\\Software\\RegisteredApplications',
      '/v',
      'win-link-router',
      '/f',
    ]);
  });
});
