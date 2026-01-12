import type { ReactNode } from 'react';
import { useEffect } from 'react';

/**
 * Requirements addressed:
 * - Renderer must not rely on window.alert/confirm/prompt; use in-app dialogs.
 * - Keep the UI accessible (role="dialog", aria-modal) and non-blocking.
 */
export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { open, title, onClose, children, footer } = props;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [onClose, open]);

  if (!open) return null;

  return (
    <div
      className="modalBackdrop"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" role="dialog" aria-modal="true" aria-label={title}>
        <div className="modalHeader">
          <h3 className="modalTitle">{title}</h3>
          <button type="button" onClick={onClose} aria-label="Close dialog">
            ✕
          </button>
        </div>

        <div className="modalBody">{children}</div>

        {footer ? <div className="modalFooter">{footer}</div> : null}
      </div>
    </div>
  );
}
