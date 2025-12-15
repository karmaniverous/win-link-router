import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { Greeting } from './Greeting';

describe('Greeting', () => {
  it('renders the provided name', () => {
    const html = renderToStaticMarkup(<Greeting name="World" />);
    expect(html).toBe('<span>Hello World</span>');
  });

  it('escapes content in rendered output', () => {
    const html = renderToStaticMarkup(
      <Greeting name={'<script>alert("x")</script>'} />,
    );
    expect(html).toBe(
      '<span>Hello &lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;</span>',
    );
  });
});
