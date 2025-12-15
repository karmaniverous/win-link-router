import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { Greeting } from './Greeting';

describe('Greeting', () => {
  it('returns a React element', () => {
    const el = Greeting({ name: 'World' });

    expect(isValidElement<{ children: unknown }>(el)).toBe(true);
    if (!isValidElement<{ children: unknown }>(el)) {
      throw new Error('Expected a React element');
    }

    expect(el.type).toBe('span');
    expect(el.props.children).toEqual(['Hello ', 'World']);
  });
});
