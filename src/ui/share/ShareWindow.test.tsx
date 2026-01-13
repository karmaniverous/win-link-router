import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { MantineTestProvider } from '../test/MantineTestProvider';
import { ShareWindow } from './ShareWindow';

describe('ShareWindow', () => {
  it('renders share CTA content', () => {
    const html = renderToStaticMarkup(
      <MantineTestProvider>
        <ShareWindow />
      </MantineTestProvider>,
    );
    expect(html).toContain('Like win-link-router? Tell your friends!');
  });
});
