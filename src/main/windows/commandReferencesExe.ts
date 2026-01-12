/**
 * Requirements addressed:
 * - Support robust Windows default-handler detection when ProgId values are
 *   opaque (e.g. AppX*): we may need to inspect the associated open command.
 * - Keep parsing logic pure/testable (no registry IO).
 */
import path from 'node:path';

export function commandReferencesExe(
  command: string,
  exePath: string,
): boolean {
  const hay = command.toLowerCase();
  const exeLower = exePath.toLowerCase();
  const exeName = path.basename(exePath).toLowerCase();

  // Prefer exact path match when present.
  if (hay.includes(exeLower)) return true;

  // Fall back to basename match (covers Update.exe --processStart <exeName>).
  if (exeName && hay.includes(exeName)) return true;

  return false;
}
