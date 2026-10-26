export const LAB_COLORS: Record<string, string> = {
  deepseek: '#0d9488',
  minimax: '#f59e0b',
  zhipu: '#8b5cf6',
  'z-ai': '#8b5cf6',
  meta: '#3b82f6',
  xiaomi: '#ef4444',
  reflection: '#10b981',
  nvidia: '#22c55e',
  openai: '#10a37f',
  meituan: '#f97316',
  anthropic: '#d97757',
  alibaba: '#7c3aed',
  qwen: '#7c3aed',
  moonshotai: '#eab308',
  inclusionai: '#06b6d4',
  stepfun: '#ec4899',
  tencent: '#0ea5e9',
  google: '#4285f4',
  xai: '#e5e7eb',
  'x-ai': '#e5e7eb',
  mistral: '#f97316',
  mistralai: '#f97316',
  cohere: '#6366f1',
  microsoft: '#38bdf8',
  amazon: '#fbbf24',
  perplexity: '#14b8a6',
};

const FALLBACK = ['#0ea5e9', '#f43f5e', '#a3e635', '#facc15', '#c084fc', '#fb7185', '#34d399', '#fbbf24', '#60a5fa', '#f472b6'];

export function labColor(lab: string, idx = 0): string {
  const key = lab.toLowerCase();
  if (LAB_COLORS[key]) return LAB_COLORS[key];
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length] ?? FALLBACK[idx % FALLBACK.length]!;
}
