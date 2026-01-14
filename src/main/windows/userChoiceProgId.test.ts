import { describe, expect, it, vi } from 'vitest';

import { getUserChoiceProgId } from './userChoiceProgId';

vi.mock('./regExe', () => {
  return {
    regQueryValue: vi.fn(),
  };
});

function getMock() {
  const mod = vi.mocked(require('./regExe') as typeof import('./regExe'));
  return mod.regQueryValue;
}

describe('getUserChoiceProgId', () => {
  it('prefers UserChoiceLatest\\ProgId when present', async () => {
    const regQueryValue = getMock();
    regQueryValue.mockResolvedValueOnce('win-link-router.url.tel');

    const actual = await getUserChoiceProgId('TEL');
    expect(actual).toBe('win-link-router.url.tel');

    expect(regQueryValue).toHaveBeenCalledTimes(1);
    expect(regQueryValue.mock.calls[0]?.[0]).toMatchObject({
      hive: 'HKCU',
      key: expect.stringContaining(
        '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
      ),
      name: 'ProgId',
    });
  });

  it('falls back to legacy UserChoice\\ProgId when latest is missing', async () => {
    const regQueryValue = getMock();
    regQueryValue.mockResolvedValueOnce(null);
    regQueryValue.mockResolvedValueOnce('Applications\\win-link-router.exe');

    const actual = await getUserChoiceProgId('tel');
    expect(actual).toBe('Applications\\win-link-router.exe');

    expect(regQueryValue).toHaveBeenCalledTimes(2);
    expect(regQueryValue.mock.calls[0]?.[0]).toMatchObject({
      hive: 'HKCU',
      key: expect.stringContaining(
        '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
      ),
      name: 'ProgId',
    });
    expect(regQueryValue.mock.calls[1]?.[0]).toMatchObject({
      hive: 'HKCU',
      key: expect.stringContaining('\\UrlAssociations\\tel\\UserChoice'),
      name: 'ProgId',
    });
  });
});
