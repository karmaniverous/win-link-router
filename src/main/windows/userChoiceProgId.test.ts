import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as regExe from './regExe';
import { getUserChoiceProgId } from './userChoiceProgId';

describe('getUserChoiceProgId', () => {
  const regQueryValueSpy = vi.spyOn(regExe, 'regQueryValue');

  beforeEach(() => {
    regQueryValueSpy.mockReset();
  });

  afterAll(() => {
    regQueryValueSpy.mockRestore();
  });

  it('prefers UserChoiceLatest\\ProgId when present', async () => {
    regQueryValueSpy.mockResolvedValueOnce('win-link-router.url.tel');

    const actual = await getUserChoiceProgId('TEL');
    expect(actual).toBe('win-link-router.url.tel');

    expect(regQueryValueSpy).toHaveBeenCalledTimes(1);
    expect(regQueryValueSpy.mock.calls[0]?.[0]).toMatchObject({
      hive: 'HKCU',
      key: expect.stringContaining(
        '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
      ),
      name: 'ProgId',
    });
  });

  it('falls back to legacy UserChoice\\ProgId when latest is missing', async () => {
    regQueryValueSpy.mockResolvedValueOnce(null);
    regQueryValueSpy.mockResolvedValueOnce('Applications\\win-link-router.exe');

    const actual = await getUserChoiceProgId('tel');
    expect(actual).toBe('Applications\\win-link-router.exe');

    expect(regQueryValueSpy).toHaveBeenCalledTimes(2);
    expect(regQueryValueSpy.mock.calls[0]?.[0]).toMatchObject({
      hive: 'HKCU',
      key: expect.stringContaining(
        '\\UrlAssociations\\tel\\UserChoiceLatest\\ProgId',
      ),
      name: 'ProgId',
    });
    expect(regQueryValueSpy.mock.calls[1]?.[0]).toMatchObject({
      hive: 'HKCU',
      key: expect.stringContaining('\\UrlAssociations\\tel\\UserChoice'),
      name: 'ProgId',
    });
  });
});
