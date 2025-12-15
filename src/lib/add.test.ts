import { describe, expect, it } from 'vitest';

import { add } from './add';

describe('add', () => {
  it('adds two numbers', () => {
    expect(add(1, 2)).toBe(3);
  });

  it('supports negative numbers', () => {
    expect(add(-1, -2)).toBe(-3);
  });
});
