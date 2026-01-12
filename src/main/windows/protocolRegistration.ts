/**
 * Requirements addressed:
 * - Register as a candidate handler per configured scheme under HKCU (no admin).
 * - Do not set defaults programmatically; only detect default status.
 * - Detect default status robustly via UserChoice ProgId compare (including
 *   Applications\<exe>.exe ProgIds when applicable).
 * - List schemes the app is registered for from its own Capabilities.
 * - Registration must follow enabled schemes (remove stale URLAssociations).
 */
import { type AppConfig, normalizeScheme } from '../../core/config/appConfig';
import {
  computeDefaultHandlerStatus,
  type DefaultHandlerStatus,
} from './defaultHandlerProgId';
import {
  regDeleteValue,
  regListValues,
  regQueryValue,
  regSetValue,
} from './regExe';

const VENDOR_KEY = 'Software\\karmaniverous\\win-link-router';
const CAPABILITIES_KEY = `${VENDOR_KEY}\\Capabilities`;
const URL_ASSOCIATIONS_KEY = `${CAPABILITIES_KEY}\\URLAssociations`;
const REGISTERED_APPLICATIONS_KEY = 'Software\\RegisteredApplications';

interface SchemeWindowsStatus {
  scheme: string;
  enabled: boolean;
  registered: boolean;
  defaultStatus: DefaultHandlerStatus;
  expectedProgId: string;
  actualProgId?: string | null;
}

function progIdForScheme(scheme: string): string {
  // Keep stable; used for comparing UserChoice ProgId values.
  return `win-link-router.url.${scheme.toLowerCase()}`;
}

function progIdKey(progId: string): string {
  return `Software\\Classes\\${progId}`;
}

function buildOpenCommand(exePath: string): string {
  // reg.exe stores the value verbatim; we include quoting explicitly.
  return `"${exePath}" "%1"`;
}

export async function ensureCandidateRegistration(opts: {
  isPackaged: boolean;
  exePath: string;
  appDisplayName: string;
  appDescription: string;
  enabledSchemes: string[];
}): Promise<{ ok: boolean; warnings: string[] }> {
  const warnings: string[] = [];
  if (!opts.isPackaged) {
    warnings.push(
      [
        'Protocol registration is disabled while not packaged.',
        'To test Windows Default Apps integration, build and run a packaged app (e.g. `npm run make` and run the generated installer / exe from `out/`).',
        'Then use “Ensure Registration” to register enabled schemes under HKCU so the app appears as a candidate handler.',
      ].join(' '),
    );
    return { ok: true, warnings };
  }

  const desiredSchemeNames = new Set(
    opts.enabledSchemes.map((s) => normalizeScheme(s).toLowerCase()),
  );

  // Remove stale URLAssociations values so registration matches enabled schemes.
  // This only touches our own Capabilities key.
  const existing = await regListValues({
    hive: 'HKCU',
    key: URL_ASSOCIATIONS_KEY,
  });
  for (const existingName of Object.keys(existing)) {
    if (!desiredSchemeNames.has(existingName)) {
      try {
        await regDeleteValue({
          hive: 'HKCU',
          key: URL_ASSOCIATIONS_KEY,
          name: existingName,
        });
      } catch (err) {
        warnings.push(
          `Failed to remove URLAssociation "${existingName}": ${(err as Error).message}`,
        );
      }
    }
  }

  // Register the app as a Default Apps candidate via Capabilities.
  await regSetValue({
    hive: 'HKCU',
    key: REGISTERED_APPLICATIONS_KEY,
    name: opts.appDisplayName,
    type: 'REG_SZ',
    data: CAPABILITIES_KEY,
  });

  await regSetValue({
    hive: 'HKCU',
    key: CAPABILITIES_KEY,
    name: 'ApplicationName',
    type: 'REG_SZ',
    data: opts.appDisplayName,
  });
  await regSetValue({
    hive: 'HKCU',
    key: CAPABILITIES_KEY,
    name: 'ApplicationDescription',
    type: 'REG_SZ',
    data: opts.appDescription,
  });

  // Per-scheme ProgIds + URLAssociations.
  for (const rawScheme of opts.enabledSchemes) {
    const scheme = normalizeScheme(rawScheme);
    const progId = progIdForScheme(scheme);

    // Capabilities mapping: scheme => ProgId.
    await regSetValue({
      hive: 'HKCU',
      key: URL_ASSOCIATIONS_KEY,
      name: scheme.toLowerCase(),
      type: 'REG_SZ',
      data: progId,
    });

    // Define ProgId as a URL protocol handler.
    await regSetValue({
      hive: 'HKCU',
      key: progIdKey(progId),
      name: null,
      type: 'REG_SZ',
      data: `URL:${scheme} Protocol`,
    });
    await regSetValue({
      hive: 'HKCU',
      key: progIdKey(progId),
      name: 'URL Protocol',
      type: 'REG_SZ',
      data: '',
    });
    await regSetValue({
      hive: 'HKCU',
      key: `${progIdKey(progId)}\\shell\\open\\command`,
      name: null,
      type: 'REG_SZ',
      data: buildOpenCommand(opts.exePath),
    });
  }

  return { ok: true, warnings };
}

async function getRegisteredUrlAssociations(): Promise<Record<string, string>> {
  // scheme(lowercase) => ProgId
  return regListValues({ hive: 'HKCU', key: URL_ASSOCIATIONS_KEY });
}

async function getUserChoiceProgId(scheme: string): Promise<string | null> {
  const normalized = normalizeScheme(scheme).toLowerCase();
  const key = `Software\\Microsoft\\Windows\\Shell\\Associations\\UrlAssociations\\${normalized}\\UserChoice`;
  return regQueryValue({ hive: 'HKCU', key, name: 'ProgId' });
}

async function getSchemeWindowsStatus(
  scheme: string,
  enabled: boolean,
  exePath?: string,
): Promise<SchemeWindowsStatus> {
  const normalized = normalizeScheme(scheme);
  const expectedProgId = progIdForScheme(normalized);

  const urlAssociations = await getRegisteredUrlAssociations();
  const registeredProgId = urlAssociations[normalized.toLowerCase()] ?? null;
  const registered =
    typeof registeredProgId === 'string' &&
    registeredProgId.toLowerCase() === expectedProgId.toLowerCase();

  const actualProgId = await getUserChoiceProgId(normalized);
  const defaultStatus: DefaultHandlerStatus = computeDefaultHandlerStatus({
    expectedProgId,
    actualProgId,
    exePath,
  });

  return {
    scheme: normalized,
    enabled,
    registered,
    defaultStatus,
    expectedProgId,
    actualProgId,
  };
}

export async function getAllSchemeStatusesFromConfig(
  config: AppConfig,
  opts?: { exePath?: string },
): Promise<SchemeWindowsStatus[]> {
  const statuses: SchemeWindowsStatus[] = [];
  for (const s of config.schemes) {
    statuses.push(
      await getSchemeWindowsStatus(s.scheme, s.enabled, opts?.exePath),
    );
  }
  return statuses;
}
