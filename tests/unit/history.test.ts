import { describe, expect, it } from 'vitest';
import { buildHistoryForRun, buildOcBackfill, historyFilePath, historyFileKind } from '../../scripts/lib/history.ts';
import type { ModelRow } from '../../shared/types.ts';

function row(key: string, lab: string, ocDay: number | null, orDay: number | null): ModelRow {
  return {
    key, name: key, lab, labName: lab,
    modalities: [],
    meta: { name: key, lab, labName: lab, contextTokens: null, outputTokens: null, releaseDate: null, knowledgeCutoff: null, inputModalities: [], outputModalities: [], reasoning: null, toolCall: null, openWeights: null, pricing: null, orPricing: null, opencodePage: null, openrouterPage: null },
    opencode: ocDay != null ? {
      tokens: { day: ocDay, week: ocDay, month: ocDay }, twoMonthTokens: ocDay,
      share: { day: null, week: null, month: null }, changeWeek: null,
      daily: ocDay > 0 ? [{ date: '2026-11-01', tokens: ocDay, users: 7, sessions: 3, costUsd: 1 }] : [],
      variants: [{ id: `${lab}/m`, slug: 'm', name: 'm', tokens: { day: ocDay, week: ocDay, month: ocDay }, twoMonthTokens: ocDay ?? 0, daily: [], pageUrl: '', stale: false }],
      uniqueUsers: null, sessions: null, costUsd: null, cachedInputPercent: null, weeklyRetentionPercent: null, rankWeek: null, detailAvailable: true,
    } : null,
    openrouter: orDay != null ? {
      tokens: { day: orDay, week: orDay, month: orDay }, share: { day: null, week: null, month: null }, changeWeek: null,
      variants: [{ variant: 'standard', permaslug: `${lab}/m`, tokens: { day: orDay, week: orDay, month: orDay }, changeWeek: null, requests: { day: null, week: 1, month: null }, promptTokens: { day: null, week: null, month: null }, completionTokens: { day: null, week: null, month: null }, byokTokens: { day: null, week: null, month: null } }],
      requests: { day: 5, week: 5, month: 5 }, promptTokens: { day: 1, week: 1, month: 1 }, completionTokens: { day: 2, week: 2, month: 2 }, byokTokens: { day: 3, week: 3, month: 3 },
      matchType: 'exact',
    } : null,
    combined: { tokens: { day: null, week: null, month: null }, share: { day: null, week: null, month: null }, changeWeek: null, opencode: ocDay != null, openrouter: orDay != null },
    status: ocDay != null && orDay != null ? 'matched' : ocDay != null ? 'opencode-only' : 'openrouter-only',
    stale: false,
  };
}

const match = { matched: 1, opencodeOnly: 1, openrouterOnly: 1, opencodeCoverage: 50, openrouterCoverage: 50 };

describe('historyFilePath', () => {
  it('routes combined and source-only files', () => {
    expect(historyFilePath('2026-11-01', 'combined')).toBe('public/data/history/2026/11/2026-11-01.json');
    expect(historyFilePath('2026-11-01', 'oc')).toBe('public/data/history/2026/11/2026-11-01.oc.json');
    expect(historyFilePath('2026-11-01', 'or')).toBe('public/data/history/2026/11/2026-11-01.or.json');
  });
  it('detects kind from filename', () => {
    expect(historyFileKind('x/2026-11-01.json')).toBe('combined');
    expect(historyFileKind('x/2026-11-01.oc.json')).toBe('oc');
    expect(historyFileKind('x/2026-11-01.or.json')).toBe('or');
  });
});

describe('buildHistoryForRun', () => {
  it('writes one combined file when dates match', () => {
    const files = buildHistoryForRun({
      ocDate: '2026-11-01', orDate: '2026-11-01', generatedAt: '2026-11-02T00:00:00Z',
      opencodeAsOf: '2026-11-01T00:00:00Z', openrouterAsOf: '2026-11-01',
      ocDayTotal: 100, orDayTotal: 50, models: [row('oc:a', 'a', 100, null), row('oc:b', 'b', 10, 50)],
      match,
    });
    expect(files.length).toBe(1);
    expect(files[0]!.kind).toBe('combined');
    const f = files[0]!.file;
    expect(f.date).toBe('2026-11-01');
    expect(f.partial).toBe(false);
    expect(f.totals).toEqual({ opencode: 100, openrouter: 50, combined: 150 });
    expect(f.models.length).toBe(2);
    const both = f.models.find((m) => m.key === 'oc:b')!;
    expect(both.combined).toBe(60);
    expect(both.oc?.users).toBe(7);
    expect(both.or?.permas).toEqual(['b/m']);
  });
  it('writes source-only files when dates differ', () => {
    const files = buildHistoryForRun({
      ocDate: '2026-11-02', orDate: '2026-11-01', generatedAt: '2026-11-02T00:00:00Z',
      opencodeAsOf: '2026-11-02T00:00:00Z', openrouterAsOf: '2026-11-01',
      ocDayTotal: 100, orDayTotal: 50, models: [row('oc:a', 'a', 100, 50)],
      match,
    });
    expect(files.length).toBe(2);
    const oc = files.find((x) => x.kind === 'oc')!.file;
    const or = files.find((x) => x.kind === 'or')!.file;
    expect(oc.date).toBe('2026-11-02');
    expect(oc.partial).toBe(true);
    expect(oc.totals.openrouter).toBeNull();
    expect(oc.models[0]!.or).toBeNull();
    expect(or.date).toBe('2026-11-01');
    expect(or.models[0]!.oc).toBeNull();
  });
  it('omits zero-usage models', () => {
    const files = buildHistoryForRun({
      ocDate: '2026-11-01', orDate: '2026-11-01', generatedAt: '2026-11-02T00:00:00Z',
      opencodeAsOf: '2026-11-01T00:00:00Z', openrouterAsOf: '2026-11-01',
      ocDayTotal: 0, orDayTotal: 0, models: [row('oc:z', 'z', 0, 0)],
      match,
    });
    expect(files[0]!.file.models.length).toBe(0);
  });
});

describe('buildOcBackfill', () => {
  it('skips current dates and marks partial', () => {
    const models = [row('oc:a', 'a', 100, null)];
    // row() daily only has 2026-11-01; backfill skips it when in skipDates
    const out = buildOcBackfill(models, [{ date: '2026-11-01', total: 100 }], {
      generatedAt: '2026-11-02T00:00:00Z', opencodeAsOf: '2026-11-02T00:00:00Z', openrouterAsOf: '2026-11-01',
    }, new Set(['2026-11-01']));
    expect(out.length).toBe(0);
    const out2 = buildOcBackfill(models, [{ date: '2026-11-01', total: 100 }], {
      generatedAt: '2026-11-02T00:00:00Z', opencodeAsOf: '2026-11-02T00:00:00Z', openrouterAsOf: '2026-11-01',
    }, new Set());
    expect(out2.length).toBe(1);
    expect(out2[0]!.file.partial).toBe(true);
    expect(out2[0]!.file.totals).toEqual({ opencode: 100, openrouter: null, combined: 100 });
  });
});
