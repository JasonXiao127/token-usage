import { describe, expect, it } from 'vitest';
import { addOpt, combinedUsage, prevTokens } from '../../scripts/lib/combined.ts';

describe('addOpt', () => {
  it('sums present sides', () => {
    expect(addOpt(3, 4)).toBe(7);
    expect(addOpt(null, 4)).toBe(4);
    expect(addOpt(3, null)).toBe(3);
  });
  it('is null only when both sides unknown', () => {
    expect(addOpt(null, null)).toBeNull();
    expect(addOpt(undefined, undefined)).toBeNull();
    expect(addOpt(0, 0)).toBe(0);
  });
});

describe('prevTokens', () => {
  it('derives previous from change', () => {
    expect(prevTokens(110, 0.1)).toBeCloseTo(100, 9);
    expect(prevTokens(0, null)).toBe(0);
  });
  it('returns 0 for new models', () => {
    expect(prevTokens(50, null, true)).toBe(0);
  });
  it('returns null when unknowable', () => {
    expect(prevTokens(50, null)).toBeNull();
    expect(prevTokens(50, -1)).toBeNull();
    expect(prevTokens(50, -2)).toBeNull();
  });
});

const T = { opencode: { day: 200, week: 2000, month: 8000 }, openrouter: { day: 100, week: 1000, month: 4000 } };

describe('combinedUsage', () => {
  it('sums tokens and shares matched models', () => {
    const c = combinedUsage(
      { tokens: { day: 122, week: 1220, month: 5000 }, changeWeek: 0.1 },
      { tokens: { day: 49, week: 490, month: 2000 }, changeWeek: 0.05 },
      T,
    );
    expect(c.tokens.week).toBe(1710);
    expect(c.share.week).toBeCloseTo((1710 / 3000) * 100, 9);
    expect(c.opencode).toBe(true);
    expect(c.openrouter).toBe(true);
    // prev: 1220/1.1 + 490/1.05 = 1109.09 + 466.67 = 1575.76
    expect(c.changeWeek).toBeCloseTo(1710 / (1220 / 1.1 + 490 / 1.05) - 1, 9);
    expect(c.changeIsNew).toBeUndefined();
  });
  it('falls back to the known side for single-source models', () => {
    const oc = combinedUsage({ tokens: { day: 10, week: 100, month: 400 }, changeWeek: 0.25 }, null, T);
    expect(oc.tokens.week).toBe(100);
    expect(oc.share.week).toBeCloseTo((100 / 3000) * 100, 9);
    expect(oc.changeWeek).toBeCloseTo(0.25, 9);
    expect(oc.openrouter).toBe(false);
  });
  it('marks new models instead of inventing a change', () => {
    const c = combinedUsage(
      { tokens: { day: 5, week: 50, month: 50 }, changeWeek: null, changeIsNew: true },
      null,
      T,
    );
    expect(c.changeWeek).toBeNull();
    expect(c.changeIsNew).toBe(true);
  });
  it('stays null when one side is unknown', () => {
    const c = combinedUsage(
      { tokens: { day: 10, week: 100, month: 400 }, changeWeek: 0.1 },
      { tokens: { day: 5, week: 50, month: 200 }, changeWeek: null },
      T,
    );
    expect(c.tokens.week).toBe(150);
    expect(c.changeWeek).toBeNull();
  });
});
