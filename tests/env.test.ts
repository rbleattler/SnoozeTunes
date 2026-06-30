import { describe, expect, it } from 'vitest';

import { parseTimeOrThrow } from '../src/config/env.js';

describe('parseTimeOrThrow', () => {
  it('accepts HH:mm values', () => {
    expect(parseTimeOrThrow('22:30')).toBe('22:30');
  });

  it('throws for invalid HH:mm values', () => {
    expect(() => parseTimeOrThrow('25:77')).toThrowError('Expected HH:mm');
  });
});
