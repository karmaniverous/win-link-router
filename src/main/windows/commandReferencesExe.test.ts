import { describe, expect, it } from 'vitest';

import { commandReferencesExe } from './commandReferencesExe';

describe('commandReferencesExe', () => {
  it('matches full exe path', () => {
    expect(
      commandReferencesExe(
        '"C:\\Users\\me\\AppData\\Local\\win-link-router\\app-0.0.0\\win-link-router.exe" "%1"',
        'C:\\Users\\me\\AppData\\Local\\win-link-router\\app-0.0.0\\win-link-router.exe',
      ),
    ).toBe(true);
  });

  it('matches exe basename (e.g. Update.exe --processStart)', () => {
    expect(
      commandReferencesExe(
        '"C:\\Users\\me\\AppData\\Local\\win-link-router\\Update.exe" --processStart win-link-router.exe',
        'C:\\Users\\me\\AppData\\Local\\win-link-router\\app-0.0.0\\win-link-router.exe',
      ),
    ).toBe(true);
  });

  it('returns false when command does not reference exe', () => {
    expect(
      commandReferencesExe(
        'rundll32.exe url.dll,FileProtocolHandler %1',
        'C:\\x\\win-link-router.exe',
      ),
    ).toBe(false);
  });
});
