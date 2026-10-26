import { describe, expect, it } from 'vitest';
import { normalize, normalizeSlug, splitId, stripVersion, PROVIDER_ALIAS } from '../../scripts/lib/aliases';

describe('aliases', () => {
  it('maps providers', () => {
    expect(PROVIDER_ALIAS['z-ai']).toBe('zhipuai');
    expect(PROVIDER_ALIAS['qwen']).toBe('alibaba');
    expect(PROVIDER_ALIAS['x-ai']).toBe('xai');
  });
  it('normalizes', () => {
    expect(normalize('MiniMax-M3.1-Flash')).toBe('minimaxm31flash');
    expect(normalizeSlug('deepseek-v4.1-flash')).toBe('deepseek-v4-1-flash');
  });
  it('splits ids', () => {
    expect(splitId('deepseek/deepseek-v4.1-flash')).toEqual(['deepseek', 'deepseek-v4.1-flash']);
  });
  it('strips versions', () => {
    expect(stripVersion('deepseek-v4.1-flash-20261017')).toEqual({ base: 'deepseek-v4.1-flash', ymd: '20261017', kind: '8digit' });
    expect(stripVersion('glm-5.3-flash').ymd).toBeNull();
  });
});
