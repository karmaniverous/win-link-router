import { beforeEach, describe, expect, it, vi } from 'vitest';

import { regQueryValue } from './regExe';
import { getUserChoiceProgId } from './userChoiceProgId';

vi.mock('./regExe', () => {
  return {
    regQueryValue: vi.fn(),
  };
});

describe('getUserChoiceProgId', () => {
  const regQueryValueMock = vi.mocked(regQueryValue);

  beforeEach(() => {
    regQueryValueMock.mockReset();
  });

  it('prefers UserChoiceLatest\\ProgId when present', async () => {
    regQueryValueMock.mockResolvedValueOnce('win-link-router.url.tel');

    const actual = await getUserChoiceProgId('TEL');
    expect(actual).toBe('win-link-router.url.tel');

    expect(regQueryValueMock).toHaveBeenCalledTimes(1);
    expect(regQueryValueMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        hive: 'HKCU',
        key: expect.stringContaining(
          '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
        ),
        name: 'ProgId',
      }),
    );
  });

  it('falls back to legacy UserChoice\\ProgId when latest is missing', async () => {
    regQueryValueMock.mockResolvedValueOnce(null);
    regQueryValueMock.mockResolvedValueOnce(
      'Applications\\win-link-router.exe',
    );

    const actual = await getUserChoiceProgId('tel');
    expect(actual).toBe('Applications\\win-link-router.exe');

    expect(regQueryValueMock).toHaveBeenCalledTimes(2);
    expect(regQueryValueMock).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        hive: 'HKCU',
        key: expect.stringContaining(
          '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
        ),
        name: 'ProgId',
      }),
    );
    expect(regQueryValueMock).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        hive: 'HKCU',
        key: expect.stringContaining('\\UrlAssociations\\tel\\UserChoice'),
        name: 'ProgId',
      }),
    );
  });
});
