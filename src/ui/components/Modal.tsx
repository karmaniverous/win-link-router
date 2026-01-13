/**
 * Requirements addressed:
 * - Renderer must not rely on window.alert/confirm/prompt; use in-app dialogs.
 * - Prefer Mantine primitives for dialog/modal UI (consistent styling + a11y).
 */
import { Group, Modal as MantineModal } from '@mantine/core';
import type { ReactNode } from 'react';

export function Modal(props: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { open, title, onClose, children, footer } = props;

  if (!open) return null;

  return (
    <MantineModal opened={open} onClose={onClose} title={title} centered>
      {children}
      {footer ? (
        <Group justify="flex-end" mt="md">
          {footer}
        </Group>
      ) : null}
    </MantineModal>
  );
}
