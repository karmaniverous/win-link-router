import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { App } from './App';

describe('App', () => {
  it('renders app shell', () => {
    const html = renderToStaticMarkup(<App />);
    expect(html).toContain('<h1>win-link-router</h1>');
  });
});
