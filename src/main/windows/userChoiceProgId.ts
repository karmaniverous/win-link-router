/**
 * Requirements addressed:
 * - Detect Windows default-handler status robustly based on registry state.
 *
 * Notes:
 * - Some newer Windows builds appear to maintain a `UserChoiceLatest` key that
 *   reflects the effective default selection, while leaving the legacy
 *   `UserChoice` key populated with stale/opaque ProgIds.
 * - Prefer `UserChoiceLatest\ProgId` when present, and fall back to
 *   `UserChoice\ProgId` for compatibility.
 */
import { normalizeScheme } from '../../core/config/appConfig';
import { regQueryValue } from './regExe';

function userChoiceKey(schemeLower: string): string {
  return `Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${schemeLower}\\UserChoice`;
}

function userChoiceLatestProgIdKey(schemeLower: string): string {
  return `Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${schemeLower}\\UserChoiceLatest\\ProgId`;
}

export async function getUserChoiceProgId(
  scheme: string,
): Promise<string | null> {
  const normalized = normalizeScheme(scheme).toLowerCase();

  const latest = await regQueryValue({
    hive: 'HKCU',
    key: userChoiceLatestProgIdKey(normalized),
    name: 'ProgId',
  });
  if (latest) return latest;

  return regQueryValue({
    hive: 'HKCU',
    key: userChoiceKey(normalized),
    name: 'ProgId',
  });
}
