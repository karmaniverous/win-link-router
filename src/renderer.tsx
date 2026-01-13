/**
 * Requirements addressed:
 * - Renderer UI must be implemented using Mantine as the primary component
 *   library.
 * - Import Mantine styles at the root of the renderer.
 */
import '@mantine/core/styles.css';
import './index.css';

import { MantineProvider } from '@mantine/core';
import { createRoot } from 'react-dom/client';

import { App } from './ui/App';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

createRoot(container).render(
  <MantineProvider defaultColorScheme="light">
    <App />
  </MantineProvider>,
);
