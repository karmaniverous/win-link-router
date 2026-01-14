import type { Mock } from 'vitest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { getUserChoiceProgId } from './userChoiceProgId';

interface RegQueryValueOpts {
  hive: 'HKCU' | 'HKCR';
  key: string;
  name: string | null;
}

const { regQueryValueMock } = vi.hoisted(() => {
  const regQueryValueMock: Mock<
    [RegQueryValueOpts],
    Promise<string | null>
  > = vi.fn();
  return { regQueryValueMock };
});

vi.mock('./regExe', () => ({ regQueryValue: regQueryValueMock }));

describe('getUserChoiceProgId', () => {
  beforeEach(() => {
    regQueryValueMock.mockReset();
  });

  it('prefers UserChoiceLatest\\ProgId when present', async () => {
    regQueryValueMock.mockResolvedValueOnce('win-link-router.url.tel');

    const actual = await getUserChoiceProgId('TEL');
    expect(actual).toBe('win-link-router.url.tel');

    expect(regQueryValueMock).toHaveBeenCalledTimes(1);
    const call0 = regQueryValueMock.mock.calls[0]?.[0];
    expect(call0?.hive).toBe('HKCU');
    expect(call0?.name).toBe('ProgId');
    expect(call0?.key).toContain(
      '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
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
    const call0 = regQueryValueMock.mock.calls[0]?.[0];
    expect(call0?.hive).toBe('HKCU');
    expect(call0?.name).toBe('ProgId');
    expect(call0?.key).toContain(
      '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
    );

    const call1 = regQueryValueMock.mock.calls[1]?.[0];
    expect(call1?.hive).toBe('HKCU');
    expect(call1?.name).toBe('ProgId');
    expect(call1?.key).toContain('\\UrlAssociations\\tel\\UserChoice');
  });
});
