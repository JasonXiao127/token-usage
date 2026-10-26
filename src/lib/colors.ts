export const LAB_COLORS: Record<string, string> = {
  deepseek: '#3E5C76',
  minimax: '#9A6517',
  zhipu: '#7A5C72',
  'z-ai': '#7A5C72',
  meta: '#4E6E81',
  xiaomi: '#A5502E',
  reflection: '#5F7161',
  nvidia: '#6B7F59',
  openai: '#3D5A80',
  meituan: '#96604B',
  anthropic: '#8C6D4F',
  alibaba: '#55608A',
  qwen: '#55608A',
  moonshotai: '#8A7340',
  inclusionai: '#4E7D74',
  stepfun: '#8A5560',
  tencent: '#4A6FA5',
  google: '#5F6B6D',
  xai: '#6E6259',
  'x-ai': '#6E6259',
  mistral: '#96604B',
  mistralai: '#96604B',
  cohere: '#5A6B8A',
  microsoft: '#4E7E8A',
  amazon: '#8A7340',
  perplexity: '#4E7D74',
};

const FALLBACK = ['#5A6B7A', '#7A6A54', '#66755C', '#8A5A60', '#546078', '#756650', '#5F7A72', '#846B4F'];

export function labColor(lab: string, idx = 0): string {
  const key = lab.toLowerCase();
  if (LAB_COLORS[key]) return LAB_COLORS[key];
  let h = 0;
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return FALLBACK[h % FALLBACK.length] ?? FALLBACK[idx % FALLBACK.length]!;
}
