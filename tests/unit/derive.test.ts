import { describe, expect, it } from 'vitest';
import { labBreakdown, largestMoves, modelsWithUsage, modalityOf, inputLine, outputLine, extraInputs, type LabSlice } from '../../src/lib/derive.ts';
import type { DataFile, ModelRow } from '../../shared/types.ts';

function row(key: string, lab: string, labName: string, week: number, changeWeek: number | null = 0, isNew = false): ModelRow {
  return {
    key, name: key, lab, labName, modalities: [],
    meta: { name: key, lab, labName, contextTokens: null, outputTokens: null, releaseDate: null, knowledgeCutoff: null, inputModalities: [], outputModalities: [], reasoning: null, toolCall: null, openWeights: null, pricing: null, orPricing: null, opencodePage: null, openrouterPage: null },
    opencode: null, openrouter: null,
    combined: {
      tokens: { day: week, week, month: week },
      share: { day: null, week: null, month: null },
      changeWeek, ...(isNew ? { changeIsNew: true as const } : {}),
      opencode: true, openrouter: true,
    },
    status: 'matched', stale: false,
  };
}

function file(rows: ModelRow[], totalWeek: number): DataFile {
  return {
    generatedAt: '2026-10-26T00:00:00Z',
    window: { day: '2026-10-25', weekStart: '2026-10-19', end: '2026-10-25', monthStart: '2026-09-26', opencodeUpdatedAt: '2026-10-26T00:00:00Z', openrouterAsOf: '2026-10-25' },
    totals: {
      opencode: { day: 0, week: 0, month: 0 },
      openrouter: { day: 0, week: 0, month: 0 },
      combined: { day: totalWeek, week: totalWeek, month: totalWeek },
      opencodeModelsWithUsage: { day: 0, week: 0, month: 0 },
      openrouterModelsWithUsage: { day: 0, week: 0, month: 0 },
      matchedModels: rows.length,
    },
    match: { opencodeModels: 0, opencodeUsageGroups: 0, openrouterModels: 0, matchedGroups: 0, opencodeOnlyGroups: 0, openrouterOnlyModels: 0, openrouterTokenCoverage: { day: null, week: null, month: null }, opencodeTokenCoverage: { day: null, week: null, month: null }, unmatchedTop: [], warnings: [] },
    labs: [],
    models: rows,
  } as unknown as DataFile;
}

describe('modelsWithUsage', () => {
  it('counts only the selected metric', () => {
    const a = row('a', 'x', 'X', 10);
    a.combined.tokens.day = 0; a.combined.tokens.week = 10; a.combined.tokens.month = 0;
    const b = row('b', 'x', 'X', 0);
    b.combined.tokens.day = 5; b.combined.tokens.week = 0; b.combined.tokens.month = 0;
    const d = file([a, b], 100);
    expect(modelsWithUsage(d, 'week')).toBe(1);
    expect(modelsWithUsage(d, 'day')).toBe(1);
    expect(modelsWithUsage(d, 'month')).toBe(0);
  });
});

describe('labBreakdown', () => {
  it('sums to 100 with Other and respects top-n', () => {
    const rows = [
      row('a', 'deepseek', 'DeepSeek', 53),
      row('b', 'minimax', 'MiniMax', 11),
      row('c', 'zhipu', 'Zhipu', 8),
      row('d', 'openai', 'OpenAI', 5),
      row('e', 'nvidia', 'NVIDIA', 4),
      row('f', 'meta', 'Meta', 3),
      row('g', 'xiaomi', 'Xiaomi', 2),
      row('h', 'anthropic', 'Anthropic', 1),
    ];
    const d = file(rows, 100);
    const out: LabSlice[] = labBreakdown(d, 'week', 6);
    expect(out.length).toBe(7);
    expect(out[6]!.isOther).toBe(true);
    expect(out[6]!.name).toBe('Other');
    const sum = out.reduce((s, r) => s + r.share, 0);
    expect(sum).toBeCloseTo(100, 9);
  });
  it('is safe on zero total', () => {
    const clean = file([], 0);
    expect(labBreakdown(clean, 'week', 6)).toEqual([]);
  });
});

describe('largestMoves', () => {
  it('excludes new and below-threshold, sorts by absolute change', () => {
    const rows = [
      row('big-up', 'a', 'A', 10, 0.9),
      row('big-down', 'a', 'A', 10, -0.8),
      row('tiny', 'a', 'A', 0.1, 5),
      row('new', 'a', 'A', 10, null, true),
      row('flat', 'a', 'A', 10, 0.01),
    ];
    const d = file(rows, 100);
    const out = largestMoves(d, 0.005, 6);
    expect(out.map((m) => m.key)).toEqual(['big-up', 'big-down', 'flat']);
  });
});

describe('modalityOf', () => {
  const withMods = (inn: string[], out: string[]): ModelRow => {
    const m = row('m', 'meta', 'Meta', 10);
    m.meta.inputModalities = inn;
    m.meta.outputModalities = out;
    return m;
  };
  it('labels by what the model generates, not what it accepts', () => {
    // Multimodal-input chatbots are still Text models.
    expect(modalityOf(withMods(['text', 'image', 'video', 'pdf', 'audio'], ['text']))).toBe('Text');
    expect(modalityOf(withMods(['text', 'image'], ['text']))).toBe('Text');
    expect(modalityOf(withMods(['text'], ['text']))).toBe('Text');
  });
  it('labels genuine generators', () => {
    expect(modalityOf(withMods(['text', 'audio'], ['text', 'audio']))).toBe('Audio');
    expect(modalityOf(withMods(['text'], ['image']))).toBe('Image');
    expect(modalityOf(withMods(['text'], ['video']))).toBe('Video');
  });
  it('prioritizes generation over text and is case/whitespace tolerant', () => {
    expect(modalityOf(withMods(['text'], ['text', 'image']))).toBe('Image');
    expect(modalityOf(withMods(['text'], ['TEXT']))).toBe('Text');
    expect(modalityOf(withMods(['text'], [' text ']))).toBe('Text');
    expect(modalityOf(withMods(['text'], ['', '  ']))).toBeNull();
  });
  it('returns null (omit the label) when output is unknown', () => {
    expect(modalityOf(withMods([], []))).toBeNull();
    expect(modalityOf(withMods(['text'], []))).toBeNull();
  });
});

describe('inputLine / extraInputs', () => {
  it('dedupes with text first and surfaces non-text inputs', () => {
    const m = row('m', 'meta', 'Meta', 10);
    m.meta.inputModalities = ['text', 'image', 'video', 'pdf', 'audio', 'image'];
    expect(inputLine(m)).toEqual(['text', 'image', 'video', 'pdf', 'audio']);
    expect(extraInputs(m)).toEqual(['image', 'video', 'pdf', 'audio']);
    const t = row('t', 'a', 'A', 10);
    t.meta.inputModalities = ['text'];
    expect(inputLine(t)).toEqual(['text']);
    expect(extraInputs(t)).toEqual([]);
  });
  it('handles missing text, case variants, and blanks', () => {
    const m = row('m', 'meta', 'Meta', 10);
    m.meta.inputModalities = ['Image', '', '  ', 'audio', 'image'];
    expect(inputLine(m)).toEqual(['image', 'audio']);
    expect(extraInputs(m)).toEqual(['image', 'audio']);
  });
});

describe('outputLine', () => {
  it('dedupes in source order, lowercased, blanks dropped', () => {
    const m = row('m', 'meta', 'Meta', 10);
    m.meta.outputModalities = ['text', 'Audio', 'text', ''];
    expect(outputLine(m)).toEqual(['text', 'audio']);
    const e = row('e', 'a', 'A', 10);
    expect(outputLine(e)).toEqual([]);
  });
});
