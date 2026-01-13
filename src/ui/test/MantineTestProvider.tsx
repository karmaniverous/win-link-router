/**
 * Requirements addressed:
 * - Renderer uses Mantine as the primary component library.
 * - Tests that render Mantine components must wrap them in MantineProvider.
 */
import { MantineProvider } from '@mantine/core';
import type { ReactNode } from 'react';

export function MantineTestProvider(props: { children: ReactNode }) {
  return (
    <MantineProvider defaultColorScheme="light">
      {props.children}
    </MantineProvider>
  );
}
