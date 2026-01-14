/**
 * Requirements addressed:
 * - Register as a candidate handler per configured scheme under HKCU (no admin).
 * - Do not set defaults programmatically; only detect default status.
 * - Detect default status robustly via UserChoice ProgId compare (including
 *   Applications\<exe>.exe ProgIds when applicable).
 * - List schemes the app is registered for from its own Capabilities.
 * - Registration must follow desired registered schemes (remove stale URLAssociations).
 * - Deregistration must clean up associated ProgId key trees.
 * - If no schemes are registered, remove the RegisteredApplications entry.
 */
import { type AppConfig, normalizeScheme } from '../../core/config/appConfig';
import {
  buildAppxProgIdHints,
  isLikelyAppxProgIdForThisApp,
} from './appxProgIdHeuristics';
import { commandReferencesExe } from './commandReferencesExe';
import {
  computeDefaultHandlerStatus,
  type DefaultHandlerStatus,
} from './defaultHandlerProgId';
import {
  regDeleteKey,
  regDeleteValue,
  regListValues,
  regQueryValue,
  regSetValue,
} from './regExe';

const VENDOR_KEY = 'Software\\karmaniverous\\win-link-router';
const CAPABILITIES_KEY = `${VENDOR_KEY}\\Capabilities`;
const URL_ASSOCIATIONS_KEY = `${CAPABILITIES_KEY}\\URLAssociations`;
const REGISTERED_APPLICATIONS_KEY = 'Software\\RegisteredApplications';
const APP_DISPLAY_NAME = 'win-link-router';
const APP_VENDOR_HINT = 'karmaniverous';

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
  registeredSchemes: string[];
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
    opts.registeredSchemes.map((s) => normalizeScheme(s).toLowerCase()),
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
        // Clean up ProgId key tree for this scheme.
        await regDeleteKey({
          hive: 'HKCU',
          key: progIdKey(progIdForScheme(existingName)),
        });
      } catch (err) {
        warnings.push(
          `Failed to remove URLAssociation "${existingName}": ${(err as Error).message}`,
        );
      }
    }
  }

  // If no desired schemes, remove the app registration so it disappears as a
  // candidate handler in Default Apps.
  if (desiredSchemeNames.size === 0) {
    try {
      await regDeleteValue({
        hive: 'HKCU',
        key: REGISTERED_APPLICATIONS_KEY,
        name: opts.appDisplayName,
      });
    } catch (err) {
      warnings.push(
        `Failed to remove RegisteredApplications entry: ${(err as Error).message}`,
      );
    }
    return { ok: warnings.length === 0, warnings };
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
  for (const rawScheme of opts.registeredSchemes) {
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

async function getProgIdOpenCommand(progId: string): Promise<string | null> {
  // First check per-user classes.
  const fromUser = await regQueryValue({
    hive: 'HKCU',
    key: `Software\\Classes\\${progId}\\shell\\open\\command`,
    name: null,
  });
  if (fromUser) return fromUser;

  // Fall back to HKCR (merged classes view).
  return regQueryValue({
    hive: 'HKCR',
    key: `${progId}\\shell\\open\\command`,
    name: null,
  });
}

async function getProtocolOpenCommand(scheme: string): Promise<string | null> {
  const normalized = normalizeScheme(scheme).toLowerCase();

  const fromUser = await regQueryValue({
    hive: 'HKCU',
    key: `Software\\Classes\\${normalized}\\shell\\open\\command`,
    name: null,
  });
  if (fromUser) return fromUser;

  return regQueryValue({
    hive: 'HKCR',
    key: `${normalized}\\shell\\open\\command`,
    name: null,
  });
}

async function getAppxProgIdValues(
  progId: string,
): Promise<Record<string, string>> {
  // Best-effort only: many AppX ProgIds do not expose an "open command" the same
  // way classic ProgIds do, but they often include identifying metadata under HKCR.
  const base = await regListValues({ hive: 'HKCR', key: progId });
  const app = await regListValues({
    hive: 'HKCR',
    key: `${progId}\\Application`,
  });

  // Merge values; we only care about scanning strings for identity hints.
  return { ...base, ...app };
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

  let defaultStatus: DefaultHandlerStatus = computeDefaultHandlerStatus({
    expectedProgId,
    actualProgId,
    exePath,
  });

  if (defaultStatus === 'not-default' && actualProgId && exePath) {
    const progIdCommand = await getProgIdOpenCommand(actualProgId);
    if (progIdCommand && commandReferencesExe(progIdCommand, exePath)) {
      defaultStatus = 'default';
    } else {
      const protocolCommand = await getProtocolOpenCommand(normalized);
      if (protocolCommand && commandReferencesExe(protocolCommand, exePath)) {
        defaultStatus = 'default';
      }
    }
  }

  // If Windows reports an opaque AppX* ProgId, attempt to recognize our app
  // via HKCR metadata to avoid misreporting "unknown" when we are actually
  // the default handler.
  if (defaultStatus === 'not-default' && typeof actualProgId === 'string') {
    const appx = actualProgId.toLowerCase().startsWith('appx');
    if (appx) {
      const values = await getAppxProgIdValues(actualProgId);
      const hints = buildAppxProgIdHints({
        exePath,
        appDisplayName: APP_DISPLAY_NAME,
        vendorHint: APP_VENDOR_HINT,
      });
      defaultStatus = isLikelyAppxProgIdForThisApp({
        progId: actualProgId,
        values,
        hints,
      })
        ? 'default'
        : 'unknown';
    }
  }

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
