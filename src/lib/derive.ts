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

/** log2 clamped index: positive => OC over-index, negative => OR over-index */
export function indexRatio(m: ModelRow, metric: Metric): number | null {
  const a = shareOf(m, 'opencode', metric);
  const b = shareOf(m, 'openrouter', metric);
  if (a == null || b == null || a <= 0 || b <= 0) return null;
  return Math.log2(a / b);
}

export function indexLabel(m: ModelRow, metric: Metric): string {
  const a = shareOf(m, 'opencode', metric);
  const b = shareOf(m, 'openrouter', metric);
  if (a != null && (b == null || b <= 0)) return 'OC only';
  if (b != null && (a == null || a <= 0)) return 'OR only';
  if (a == null || b == null || a <= 0 || b <= 0) return '—';
  const r = a / b;
  if (r >= 1) return `${r >= 100 ? Math.round(r) : r.toFixed(1)}× OC`;
  return `${(1 / r >= 100 ? Math.round(1 / r) : (1 / r).toFixed(1))}× OR`;
}

export function topBy(data: DataFile, src: 'opencode' | 'openrouter', metric: Metric, n = 10): ModelRow[] {
  return [...data.models]
    .filter((m) => (tokensOf(m, src, metric) ?? 0) > 0)
    .sort((a, b) => (tokensOf(b, src, metric) ?? 0) - (tokensOf(a, src, metric) ?? 0))
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
