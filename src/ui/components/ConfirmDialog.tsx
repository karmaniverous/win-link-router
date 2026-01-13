import { Button, Text } from '@mantine/core';
import type { ReactNode } from 'react';

import { Modal } from './Modal';

/**
 * Requirements addressed:
 * - Renderer must not rely on window.confirm; use in-app dialogs.
 * - Prefer Mantine primitives for dialog UI.
 */
export function ConfirmDialog(props: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
}) {
  const {
    open,
    title,
    message,
    confirmLabel = 'Confirm',
    cancelLabel = 'Cancel',
    confirmDisabled = false,
    onConfirm,
    onCancel,
    children,
  } = props;

  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      footer={
        <>
          <Button variant="default" onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button onClick={onConfirm} disabled={confirmDisabled}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <Text>{message}</Text>
      {children}
    </Modal>
  );
}
