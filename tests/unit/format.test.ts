import { describe, expect, it } from 'vitest';
import { fmtTokens, fmtShare, fmtChange, fmtCtx, fmtPrice } from '../../src/lib/format';

describe('fmtTokens', () => {
  it('formats units', () => {
    expect(fmtTokens(0)).toBe('0');
    expect(fmtTokens(null)).toBe('—');
    expect(fmtTokens(999)).toBe('999');
    expect(fmtTokens(1500)).toBe('1.50K');
    expect(fmtTokens(2.5e9)).toBe('2.50B');
    expect(fmtTokens(122.1e12)).toBe('122T');
  });
});

describe('fmtShare', () => {
  it('formats percents', () => {
    expect(fmtShare(null)).toBe('—');
    expect(fmtShare(0)).toBe('0%');
    expect(fmtShare(59.9)).toBe('59.9%');
    expect(fmtShare(0.005)).toBe('0.005%');
  });
});

describe('fmtChange', () => {
  it('handles new/zero/na', () => {
    expect(fmtChange(null, true).text).toBe('new');
    expect(fmtChange(null).tone).toBe('na');
    expect(fmtChange(0).text).toBe('±0%');
    expect(fmtChange(0.12).text).toBe('+12.0%');
    expect(fmtChange(-0.5).tone).toBe('down');
  });
});

describe('fmtCtx/fmtPrice', () => {
  it('formats context and price', () => {
    expect(fmtCtx(1000000)).toBe('1M');
    expect(fmtCtx(128000)).toBe('128K');
    expect(fmtPrice(0.3)).toBe('$0.300');
    expect(fmtPrice(null)).toBe('—');
  });
});
