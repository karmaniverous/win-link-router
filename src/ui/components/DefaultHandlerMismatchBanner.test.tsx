import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { MantineTestProvider } from '../test/MantineTestProvider';
import { DefaultHandlerMismatchBanner } from './DefaultHandlerMismatchBanner';

describe('DefaultHandlerMismatchBanner', () => {
  it('renders when there is a mismatch', () => {
    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <DefaultHandlerMismatchBanner
          statuses={[
            {
              scheme: 'TEL',
              enabled: true,
              registered: true,
              defaultStatus: 'not-default',
            },
            {
              scheme: 'MAILTO',
              enabled: true,
              registered: true,
              defaultStatus: 'unknown',
            },
          ]}
          onOpenDefaultApps={vi.fn()}
        />
      </MantineTestProvider>,
    );

    expect(html).toContain('Default app not set for some protocols');
    expect(html).toContain('Not default');
    expect(html).toContain('TEL');
    expect(html).toContain('Unknown');
    expect(html).toContain('MAILTO');
  });
});
