import type { DataFile, Metric, ModelRow } from '../../shared/types';

export function tokensOf(m: ModelRow, src: 'opencode' | 'openrouter', metric: Metric): number | null {
  const u = src === 'opencode' ? m.opencode : m.openrouter;
  if (!u) return null;
  return u.tokens[metric];
}

export function shareOf(m: ModelRow, src: 'opencode' | 'openrouter', metric: Metric): number | null {
  const u = src === 'opencode' ? m.opencode : m.openrouter;
  if (!u) return null;
  return u.share[metric];
}

/** Combined observed tokens (OpenCode + OpenRouter) for the window. */
export function combinedTokens(m: ModelRow, metric: Metric): number | null {
  return m.combined?.tokens[metric] ?? null;
}

/** Share of the combined total — the global ranking metric. */
export function combinedShare(m: ModelRow, metric: Metric): number | null {
  return m.combined?.share[metric] ?? null;
}

/** Fraction of a model's combined tokens observed on each source. Sums to 1 when combined > 0. */
export function sourceMix(m: ModelRow, metric: Metric): { oc: number; or: number } {
  const oc = tokensOf(m, 'opencode', metric) ?? 0;
  const or = tokensOf(m, 'openrouter', metric) ?? 0;
  const total = oc + or;
  if (total <= 0) return { oc: 0, or: 0 };
  return { oc: oc / total, or: or / total };
}

/** Global ranking: models by combined observed tokens. */
export function topCombined(data: DataFile, metric: Metric, n = 12): ModelRow[] {
  return [...data.models]
    .filter((m) => (combinedTokens(m, metric) ?? 0) > 0)
    .sort((a, b) => (combinedTokens(b, metric) ?? 0) - (combinedTokens(a, metric) ?? 0))
    .slice(0, n);
}

/** Count of models with any combined usage in the window. */
export function modelsWithUsage(data: DataFile, metric: Metric): number {
  return data.models.filter((m) => (combinedTokens(m, metric) ?? 0) > 0).length;
}

export interface LabSlice { id: string; name: string; tokens: number; share: number; isOther: boolean }

/** Lab breakdown for the window: top N labs + neutral Other so shares sum to 100. */
export function labBreakdown(data: DataFile, metric: Metric, n = 6): LabSlice[] {
  const total = data.totals.combined[metric] ?? 0;
  const byLab = new Map<string, { name: string; tokens: number }>();
  for (const m of data.models) {
    const v = combinedTokens(m, metric) ?? 0;
    if (v <= 0) continue;
    const cur = byLab.get(m.lab) ?? { name: m.labName, tokens: 0 };
    cur.tokens += v;
    byLab.set(m.lab, cur);
  }
  const all = [...byLab.entries()]
    .map(([id, v]) => ({ id, name: v.name, tokens: v.tokens, share: total > 0 ? (v.tokens / total) * 100 : 0, isOther: false as boolean }))
    .sort((a, b) => b.tokens - a.tokens);
  if (all.length <= n) return all;
  const top = all.slice(0, n);
  const topTokens = top.reduce((s, r) => s + r.tokens, 0);
  const rest = Math.max(total - topTokens, 0);
  top.push({ id: '__other', name: 'Other', tokens: rest, share: total > 0 ? (rest / total) * 100 : 0, isOther: true });
  return top;
}

/** Weekly momentum view: largest absolute WoW movers above a share floor. Always weekly. */
export function largestMoves(data: DataFile, minShare = 0.005, n = 6): ModelRow[] {
  const total = data.totals.combined.week ?? 0;
  if (total <= 0) return [];
  return [...data.models]
    .filter((m) => {
      const t = m.combined.tokens.week ?? 0;
      if (t <= 0 || m.combined.changeWeek == null || m.combined.changeIsNew) return false;
      return t / total >= minShare;
    })
    .sort((a, b) => Math.abs(b.combined.changeWeek!) - Math.abs(a.combined.changeWeek!))
    .slice(0, n);
}

/**
 * What the model generates (output modalities), not what it accepts.
 * Input-only support such as image/video understanding in a text chatbot
 * must not relabel it as Image/Video. Null when the sources report no
 * output modalities — callers should omit the label rather than guess.
 */
export function modalityOf(m: ModelRow): string | null {
  const out = new Set((m.meta.outputModalities || []).map((s) => s.trim().toLowerCase()).filter(Boolean));
  if (out.has('video')) return 'Video';
  if (out.has('image')) return 'Image';
  if (out.has('audio')) return 'Audio';
  if (out.has('text')) return 'Text';
  return null;
}

/** Non-text input capabilities worth surfacing (e.g. image/video/PDF understanding in a text model). */
export function extraInputs(m: ModelRow): string[] {
  return inputLine(m).filter((k) => k !== 'text');
}

/** Deduped lowercase input modalities, text first. */
export function inputLine(m: ModelRow): string[] {
  const rest: string[] = [];
  let hasText = false;
  for (const s of m.meta.inputModalities || []) {
    const k = s.trim().toLowerCase();
    if (!k) continue;
    if (k === 'text') { hasText = true; continue; }
    if (!rest.includes(k)) rest.push(k);
  }
  return hasText ? ['text', ...rest] : rest;
}

/** Deduped lowercase output modalities, source order. */
export function outputLine(m: ModelRow): string[] {
  const out: string[] = [];
  for (const s of m.meta.outputModalities || []) {
    const k = s.trim().toLowerCase();
    if (!k || out.includes(k)) continue;
    out.push(k);
  }
  return out;
}
