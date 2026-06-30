import { describe, expect, it } from 'vitest';

import { loadConfig, parseTimeOrThrow } from '../src/config/env.js';

describe('parseTimeOrThrow', () => {
  it('accepts HH:mm values', () => {
    expect(parseTimeOrThrow('22:30')).toBe('22:30');
  });

  it('throws for invalid HH:mm values', () => {
    expect(() => parseTimeOrThrow('25:77')).toThrowError('Expected HH:mm');
  });
});


describe('loadConfig', () => {
  it('parses AUTO_START_WHEN_OCCUPIED as boolean true', () => {
    process.env.DISCORD_TOKEN = 'token';
    process.env.DISCORD_CLIENT_ID = 'client';
    process.env.AUTO_START_WHEN_OCCUPIED = 'true';

    expect(loadConfig().AUTO_START_WHEN_OCCUPIED).toBe(true);
  });
});
