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
export function topCombined(data: DataFile, metric: Metric, n = 10): ModelRow[] {
  return [...data.models]
    .filter((m) => (combinedTokens(m, metric) ?? 0) > 0)
    .sort((a, b) => (combinedTokens(b, metric) ?? 0) - (combinedTokens(a, metric) ?? 0))
    .slice(0, n);
}

export function modalityOf(m: ModelRow): string {
  const mods = new Set([...(m.meta.inputModalities || []), ...(m.meta.outputModalities || [])].map((s) => s.toLowerCase()));
  if (mods.has('video') || mods.has('audio')) return mods.has('video') ? 'Video' : 'Audio';
  if (mods.has('image')) return 'Image';
  if (mods.has('pdf')) return 'PDF';
  if (mods.has('text') && mods.size === 1) return 'Text';
  if (mods.size === 0) return 'Other';
  return 'Text+';
}
