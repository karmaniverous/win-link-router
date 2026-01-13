import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';

describe('Tabs', () => {
  it('renders tab labels', () => {
    const html = renderToStaticMarkup(
      <Tabs
        value="settings"
        onChange={vi.fn()}
        tabs={[
          { id: 'settings', label: 'Settings' },
          { id: 'log', label: 'Log' },
          { id: 'test', label: 'Test' },
        ]}
      />,
    );

    expect(html).toContain('Settings');
    expect(html).toContain('Log');
    expect(html).toContain('Test');
  });
});
