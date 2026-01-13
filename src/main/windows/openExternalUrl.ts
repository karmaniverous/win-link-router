/**
 * Requirements addressed:
 * - Renderer stays UI-focused; OS/Electron side effects live in main/preload.
 * - Provide a safe, reusable way to open external URLs (e.g., GitHub repo).
 */
import { shell } from 'electron';

function parseHttpUrl(url: string): URL {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new Error(`Unsupported protocol: ${parsed.protocol}`);
    }
    return parsed;
  } catch (err) {
    throw new Error(`Invalid external URL: ${(err as Error).message}`);
  }
}

export async function openExternalUrl(url: string): Promise<void> {
  void parseHttpUrl(url);
  await shell.openExternal(url);
}
