/**
 * Requirements addressed:
 * - When a modal window (About/Share) is open, the main window underneath it
 *   must be visibly dimmed with an overlay (in addition to being disabled).
 * - Keep renderer-side logic pure/UI-only; IPC subscription is via preload.
 */
import { useEffect, useState } from 'react';

import type { WinLinkRouterApi } from '../api/winLinkRouterApi';

export function useModalOverlay(api: WinLinkRouterApi | null): boolean {
  const [owners, setOwners] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!api?.ui) return;

    const unsubscribe = api.ui.onModalOverlayChanged((evt) => {
      setOwners((prev) => {
        const next = new Set(prev);
        if (evt.active) next.add(evt.owner);
        else next.delete(evt.owner);
        return next;
      });
    });

    return () => {
      try {
        unsubscribe();
      } catch {
        // best-effort only
      }
    };
  }, [api]);

  return owners.size > 0;
}
