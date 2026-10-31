// Canonical provider aliases: normalized OpenRouter provider -> OpenCode lab id.
// Keys MUST already be normalized (lowercase alphanumeric, no dashes):
// every lookup goes through normalize(), which strips dashes, so a key
// like 'z-ai' would never match and silently split the lab.
export const PROVIDER_ALIAS: Record<string, string> = {
  'zai': 'zhipuai',
  'zhipu': 'zhipuai',
  'qwen': 'alibaba',
  'metallama': 'meta',
  'xai': 'xai',
  'mistralai': 'mistral',
  'bytedance': 'bytedance-seed',
  'bytedanceseed': 'bytedance-seed',
  'ibmgranite': 'ibm',
  'moonshot': 'moonshotai',
  'moonshotai': 'moonshotai',
  'aionlabs': 'aion-labs',
  'blackforestlabs': 'black-forest-labs',
  'nexagi': 'nex-agi',
};

// Explicit model-level aliases: OpenRouter permaslug base -> OpenCode canonical group key
// Group keys are `lab/base-slug-normalized` after variant grouping.
export const MODEL_ALIASES: Record<string, string> = {
  'nvidia/nemotron-3-ultra-550b-a55b': 'nvidia/nemotron-3-ultra',
  'nvidia/nemotron-3.5-super-vl-120b-a12b': 'nvidia/nemotron-3.5-super-vl',
  'meta/muse-spark-1.3-contributor': 'meta/muse-spark-1.3',
  'meta/muse-spark-1.2-contributor': 'meta/muse-spark-1.2',
  'google/gemini-4-argon': 'google/gemini-4-argon',
  'recursive/flint-v1.0': 'recursive/flint-40b',
  'z-ai/glm-5.3-flash': 'zhipuai/glm-5.3-flash',
  'z-ai/glm-5.3': 'zhipuai/glm-5.3',
  'z-ai/glm-5.2': 'zhipuai/glm-5.2',
  'z-ai/glm-5.1': 'zhipuai/glm-5.1',
  'z-ai/glm-5': 'zhipuai/glm-5',
  'qwen/qwen3.8-flash': 'alibaba/qwen3.8-flash',
  'qwen/qwen3.8-max': 'alibaba/qwen3.8-max',
  'qwen/qwen3.7-plus': 'alibaba/qwen3.7-plus',
  'qwen/qwen3.7-max': 'alibaba/qwen3.7-max',
  'qwen/qwen3.6-plus': 'alibaba/qwen3.6-plus',
  'qwen/qwen3.5-plus': 'alibaba/qwen3.5-plus',
  'qwen/qwen3.8-27b': 'alibaba/qwen3.8-27b',
  'minimax/minimax-m3.1-flash': 'minimax/minimax-m3.1-flash',
  'minimax/minimax-m3': 'minimax/minimax-m3',
  'minimax/minimax-m2.7': 'minimax/minimax-m2.7',
  'minimax/minimax-m2.5': 'minimax/minimax-m2.5',
  'anthropic/claude-haiku-5.5': 'anthropic/claude-haiku-5-5',
  'anthropic/claude-sonnet-5.5': 'anthropic/claude-sonnet-5-5',
  'anthropic/claude-opus-5.5': 'anthropic/claude-opus-5-5',
  'moonshot/moonshot-kimi-k3': 'moonshotai/kimi-k3',
};

export function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '');
}

export function normalizeSlug(s: string): string {
  return s.toLowerCase().replace(/[_.]+/g, '-').replace(/[^a-z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

/** Split `provider/slug`; returns [provider, slug]. */
export function splitId(id: string): [string, string] {
  const i = id.indexOf('/');
  if (i < 0) return [id, ''];
  return [id.slice(0, i), id.slice(i + 1)];
}

/** Extract trailing date suffix. Returns { base, ymd? } */
export function stripVersion(slug: string): { base: string; ymd: string | null; kind: '8digit' | 'ymd' | 'other' | 'none' } {
  let m = slug.match(/-(\d{8})$/);
  if (m) return { base: slug.slice(0, -9), ymd: m[1]!, kind: '8digit' };
  m = slug.match(/-(\d{4})-(\d{2})-(\d{2})$/);
  if (m) return { base: slug.slice(0, m[0].length * -1), ymd: `${m[1]}${m[2]}${m[3]}`, kind: 'ymd' };
  return { base: slug, ymd: null, kind: 'none' };
}
