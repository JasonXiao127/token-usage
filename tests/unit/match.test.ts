import { describe, expect, it } from 'vitest';
import { groupKeyFor, matchOrBase, type OcGroup, type OrBase } from '../../scripts/lib/match.ts';

function group(key: string, lab: string): OcGroup {
  return {
    key, lab, labName: lab, displayName: key, modelIds: [], slugs: [],
    twoMonthTokens: 0, releaseDate: null, contextTokens: null, outputTokens: null,
    priceIn: null, priceOut: null, priceCached: null, priceWrite: null,
  };
}

function orBase(base: string, permas: string[] = []): OrBase {
  return {
    base, provider: base.split('/')[0]!, slugBase: base.split('/').slice(1).join('/'), ymd: null, permas,
    tokens: { day: 1, week: 1, month: 1 }, change: null,
    requests: { day: 0, week: 0, month: 0 }, prompt: { day: 0, week: 0, month: 0 },
    completion: { day: 0, week: 0, month: 0 }, byok: { day: 0, week: 0, month: 0 }, variants: [],
  };
}

const emptyCatalog = new Map();

describe('groupKeyFor', () => {
  it('maps variant spellings onto the canonical group', () => {
    expect(groupKeyFor('meta', 'musespark13contributor')).toBe('meta/musespark13');
    expect(groupKeyFor('nvidia', 'nemotron3ultra550ba55b')).toBe('nvidia/nemotron3ultra');
    expect(groupKeyFor('deepseek', 'deepseekv4p1flash')).toBe('deepseek/deepseekv41flash');
  });
  it('passes through non-variants', () => {
    expect(groupKeyFor('meta', 'llama318binstruct')).toBe('meta/llama318binstruct');
  });
});

describe('matchOrBase', () => {
  const groups = new Map<string, OcGroup>([
    ['blackforestlabs/fluxsecret', group('blackforestlabs/fluxsecret', 'black-forest-labs')],
    ['meta/llama318binstruct', group('meta/llama318binstruct', 'meta')],
  ]);
  it('matches un-dated OR permaslugs against dashed-lab groups (normalized namespace)', () => {
    // alias value 'black-forest-labs' keeps dashes; the group key does not
    expect(matchOrBase(orBase('black-forest-labs/flux-secret'), groups, emptyCatalog).key)
      .toBe('blackforestlabs/fluxsecret');
  });
  it('still matches dated variants via the stripped path', () => {
    expect(matchOrBase(orBase('black-forest-labs/flux-secret-20260101'), groups, emptyCatalog).key)
      .toBe('blackforestlabs/fluxsecret');
  });
  it('matches normalized providers to normalized groups', () => {
    expect(matchOrBase(orBase('meta-llama/llama-3.1-8b-instruct'), groups, emptyCatalog))
      .toEqual({ key: 'meta/llama318binstruct', type: 'exact' });
  });
  it('returns none when nothing matches', () => {
    expect(matchOrBase(orBase('other/model-x'), groups, emptyCatalog))
      .toEqual({ key: null, type: 'none' });
  });
});
