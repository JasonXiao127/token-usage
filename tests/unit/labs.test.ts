import { describe, expect, it } from 'vitest';
import { prettyLabName, catalogArchFor } from '../../scripts/lib/labs.ts';
import type { OrCatalogModel } from '../../scripts/lib/openrouter.ts';
import type { OrBase } from '../../scripts/lib/match.ts';

function orBase(base: string, permas: string[]): OrBase {
  return {
    base, provider: base.split('/')[0]!, slugBase: base.split('/').slice(1).join('/'), ymd: null, permas,
    tokens: { day: 1, week: 1, month: 1 }, change: null,
    requests: { day: 0, week: 0, month: 0 }, prompt: { day: 0, week: 0, month: 0 },
    completion: { day: 0, week: 0, month: 0 }, byok: { day: 0, week: 0, month: 0 }, variants: [],
  };
}

function catModel(id: string, inn: string[], out: string[]): OrCatalogModel {
  return {
    id, canonical_slug: id, name: id, created: 0, description: '', context_length: 0,
    architecture: { modality: '', input_modalities: inn, output_modalities: out, tokenizer: '', instruct_type: null },
    pricing: {}, top_provider: { context_length: 0, max_completion_tokens: 0, is_moderated: false },
  };
}

describe('prettyLabName', () => {
  it('prefers the known OpenCode name', () => {
    expect(prettyLabName('zhipuai', 'z-ai', 'Zhipu')).toBe('Zhipu');
  });
  it('title-cases a dashed provider', () => {
    expect(prettyLabName('dotsstudio', 'dots-studio', 'dotsstudio')).toBe('Dots Studio');
  });
  it('capitalizes a bare id', () => {
    expect(prettyLabName('typesafe', 'typesafe', 'typesafe')).toBe('Typesafe');
  });
  it('never returns empty', () => {
    expect(prettyLabName('', '', '')).toBe('');
  });
});

describe('catalogArchFor', () => {
  const cat = new Map<string, OrCatalogModel>([
    ['anthropic/claude-opus-5.5', catModel('anthropic/claude-opus-5.5', ['text', 'image', 'file'], ['text'])],
    ['anthropic/claude-opus-5.5:batch', catModel('anthropic/claude-opus-5.5:batch', ['text'], ['text'])],
    ['nvidia/nemotron-3-ultra-550b-a55b', catModel('nvidia/nemotron-3-ultra-550b-a55b', ['text'], ['text'])],
  ]);
  it('hits the exact base', () => {
    expect(catalogArchFor(cat, orBase('anthropic/claude-opus-5.5', [])))
      .toEqual({ input: ['text', 'image', 'file'], output: ['text'] });
  });
  it('de-dates variant permaslugs (catalog ids carry no date)', () => {
    expect(catalogArchFor(cat, orBase('anthropic/claude-opus-5.5', ['anthropic/claude-opus-5.5-20260921', 'anthropic/claude-opus-5.5-20260921:free'])))
      .toEqual({ input: ['text', 'image', 'file'], output: ['text'] });
  });
  it('resolves variant families through the dated perma', () => {
    expect(catalogArchFor(cat, orBase('nvidia/nemotron-3-ultra', ['nvidia/nemotron-3-ultra-550b-a55b-20260604'])))
      .toEqual({ input: ['text'], output: ['text'] });
  });
  it('returns null when nothing matches', () => {
    expect(catalogArchFor(cat, orBase('other/model-x', ['other/model-x']))).toBeNull();
    expect(catalogArchFor(new Map(), orBase('anthropic/claude-opus-5.5', []))).toBeNull();
  });
});
