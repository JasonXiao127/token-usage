import { fetchJson } from './fetch.ts';

export interface OrCatalogModel {
  id: string;
  canonical_slug: string;
  name: string;
  created: number;
  description: string;
  context_length: number;
  architecture: { modality: string; input_modalities: string[]; output_modalities: string[]; tokenizer: string; instruct_type: string | null };
  pricing: Record<string, string>;
  top_provider: { context_length: number; max_completion_tokens: number; is_moderated: boolean };
  supported_parameters?: string[];
  knowledge_cutoff?: string | null;
  expiration_date?: string | null;
}

export interface OrRankRow {
  date: string; // "2026-10-25 00:00:00"
  model_permaslug: string;
  variant: string;
  total_completion_tokens: number;
  total_prompt_tokens: number;
  total_native_tokens_reasoning: number;
  count: number;
  total_byok_prompt_tokens: number;
  total_byok_completion_tokens: number;
  variant_permaslug: string;
  change: number | null;
  rankingMetricValue: number;
}

const OR = 'https://openrouter.ai';

export async function fetchCatalog(): Promise<OrCatalogModel[]> {
  const j = await fetchJson<{ data: OrCatalogModel[] }>(`${OR}/api/v1/models`);
  return j.data;
}

export async function fetchRankings(view: 'day' | 'week' | 'month'): Promise<OrRankRow[]> {
  const j = await fetchJson<{ data: OrRankRow[] }>(
    `${OR}/api/frontend/v1/rankings/models?view=${view}&metric=tokens_excl_byok`,
  );
  return j.data;
}

export function rankDate(row: OrRankRow): string {
  return row.date.slice(0, 10);
}

export function rankTokensExclByok(row: OrRankRow): number {
  const total = (row.total_prompt_tokens || 0) + (row.total_completion_tokens || 0);
  const byok = (row.total_byok_prompt_tokens || 0) + (row.total_byok_completion_tokens || 0);
  return Math.max(0, total - byok);
}
