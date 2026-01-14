/**
 * Requirements addressed:
 * - Renderer UI must be implemented using Mantine as the primary component
 *   library.
 * - Import Mantine styles at the root of the renderer.
 * - Support separate renderer views for Share and About windows.
 */
import '@mantine/core/styles.css';
import './index.css';

import { MantineProvider } from '@mantine/core';
import { createRoot } from 'react-dom/client';

import { AboutWindow } from './ui/about/AboutWindow';
import { App } from './ui/App';
import { ShareWindow } from './ui/share/ShareWindow';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Missing #root element in index.html');
}

const params = new URLSearchParams(window.location.search);
const view = params.get('view') ?? 'main';
const Root =
  view === 'share' ? ShareWindow : view === 'about' ? AboutWindow : App;

createRoot(container).render(
  <MantineProvider defaultColorScheme="light">
    <Root />
  </MantineProvider>,
);
