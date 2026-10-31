import { describe, expect, it } from 'vitest';
import { normalize, normalizeSlug, splitId, stripVersion, PROVIDER_ALIAS } from '../../scripts/lib/aliases';

describe('aliases', () => {
  it('maps providers (keys are pre-normalized: no dashes)', () => {
    expect(PROVIDER_ALIAS['zai']).toBe('zhipuai');
    expect(PROVIDER_ALIAS['qwen']).toBe('alibaba');
    expect(PROVIDER_ALIAS['xai']).toBe('xai');
    expect(PROVIDER_ALIAS['metallama']).toBe('meta');
    expect(PROVIDER_ALIAS['ibmgranite']).toBe('ibm');
    expect(PROVIDER_ALIAS['bytedanceseed']).toBe('bytedance-seed');
    expect(PROVIDER_ALIAS['aionlabs']).toBe('aion-labs');
    expect(PROVIDER_ALIAS['blackforestlabs']).toBe('black-forest-labs');
    expect(PROVIDER_ALIAS['nexagi']).toBe('nex-agi');
  });
  it('resolves the way match/collect look it up (normalize(provider))', () => {
    for (const [k, v] of Object.entries(PROVIDER_ALIAS)) {
      expect(normalize(k)).toBe(k); // a dashed key would never match
      void v;
    }
    expect(PROVIDER_ALIAS[normalize('z-ai')]).toBe('zhipuai');
    expect(PROVIDER_ALIAS[normalize('meta-llama')]).toBe('meta');
    expect(PROVIDER_ALIAS[normalize('bytedance-seed')]).toBe('bytedance-seed');
    expect(PROVIDER_ALIAS[normalize('aion-labs')]).toBe('aion-labs');
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
