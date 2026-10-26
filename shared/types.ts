export type Metric = 'day' | 'week' | 'month';

export interface TokenSet { day: number | null; week: number | null; month: number | null }
export interface ShareSet { day: number | null; week: number | null; month: number | null }

export interface DailyPoint {
  date: string;
  tokens: number;
  users: number | null;
  sessions: number | null;
  costUsd: number | null;
}

export interface Pricing {
  input: number | null;
  output: number | null;
  cachedInput: number | null;
  cacheWrite: number | null;
}

export interface ModelMeta {
  name: string;
  lab: string;
  labName: string;
  contextTokens: number | null;
  outputTokens: number | null;
  releaseDate: string | null;
  knowledgeCutoff: string | null;
  inputModalities: string[];
  outputModalities: string[];
  reasoning: boolean | null;
  toolCall: boolean | null;
  openWeights: boolean | null;
  pricing: Pricing | null;
  orPricing: Pricing | null;
  opencodePage: string | null;
  openrouterPage: string | null;
}

export interface OpencodeVariant {
  id: string;
  slug: string;
  name: string;
  tokens: TokenSet;
  twoMonthTokens: number;
  daily: DailyPoint[];
  pageUrl: string;
  stale: boolean;
}

export interface OpencodeUsage {
  tokens: TokenSet;
  twoMonthTokens: number;
  share: ShareSet;
  changeWeek: number | null;
  changeIsNew?: boolean;
  daily: DailyPoint[];
  variants: OpencodeVariant[];
  uniqueUsers: number | null;
  sessions: number | null;
  costUsd: number | null;
  cachedInputPercent: number | null;
  weeklyRetentionPercent: number | null;
  rankWeek: number | null;
  detailAvailable: boolean;
}

export interface OpenrouterVariant {
  variant: 'standard' | 'free' | 'batch';
  permaslug: string;
  tokens: TokenSet;
  changeWeek: number | null;
  requests: TokenSet;
  promptTokens: TokenSet;
  completionTokens: TokenSet;
  byokTokens: TokenSet;
}

export interface OpenrouterUsage {
  tokens: TokenSet;
  share: ShareSet;
  changeWeek: number | null;
  variants: OpenrouterVariant[];
  requests: TokenSet;
  promptTokens: TokenSet;
  completionTokens: TokenSet;
  byokTokens: TokenSet;
  matchType: 'exact' | 'alias' | 'name' | 'none';
}

export interface CombinedUsage {
  /** Combined observed tokens: OpenCode + OpenRouter per window. */
  tokens: TokenSet;
  /** Share of the combined total — the global ranking metric. */
  share: ShareSet;
  /** WoW change derived from both sources' reported changes. Null when either side is unknown. */
  changeWeek: number | null;
  changeIsNew?: boolean;
  /** Whether the model has usage on each source (any window). */
  opencode: boolean;
  openrouter: boolean;
}

export interface ModelRow {
  key: string;
  name: string;
  lab: string;
  labName: string;
  modalities: string[];
  meta: ModelMeta;
  opencode: OpencodeUsage | null;
  openrouter: OpenrouterUsage | null;
  combined: CombinedUsage;
  status: 'matched' | 'opencode-only' | 'openrouter-only';
  stale: boolean;
}

export interface DataFile {
  schemaVersion: 1;
  generatedAt: string;
  window: {
    end: string;
    day: string;
    weekStart: string;
    monthStart: string;
    timezone: 'UTC';
    opencodeUpdatedAt: string;
    openrouterAsOf: string;
  };
  sources: Record<string, { name: string; url: string; fetchedAt: string; asOf: string; license: string | null }>;
  totals: {
    opencode: TokenSet;
    openrouter: TokenSet;
    combined: TokenSet;
    opencodeModelsWithUsage: TokenSet;
    openrouterModelsWithUsage: TokenSet;
    matchedModels: number;
  };
  match: {
    opencodeModels: number;
    opencodeUsageGroups: number;
    openrouterModels: number;
    matchedGroups: number;
    opencodeOnlyGroups: number;
    openrouterOnlyModels: number;
    openrouterTokenCoverage: ShareSet;
    opencodeTokenCoverage: ShareSet;
    unmatchedTop: Array<{ name: string; tokensWeek: number; reason: string }>;
    warnings: string[];
  };
  labs: Array<{ id: string; name: string; opencodeTokensWeek: number; openrouterTokensWeek: number; combinedTokensWeek: number; models: number }>;
  models: ModelRow[];
}
