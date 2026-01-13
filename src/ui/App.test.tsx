import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from './App';
import { MantineTestProvider } from './test/MantineTestProvider';

describe('App', () => {
  it('renders app shell', () => {
    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <App />
      </MantineTestProvider>,
    );
    expect(html).toContain('win-link-router');
  });
});
