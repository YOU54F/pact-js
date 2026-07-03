import { describe, expect, it } from 'vitest';
import { burnCpu } from './cpu-pressure';

describe('cpu pressure worker 12', () => {
  it('creates sustained compute load', () => {
    const score = burnCpu(Number(process.env.REPRO_PRESSURE_MS ?? 4000));
    expect(score).toBeGreaterThan(0);
  });
});
