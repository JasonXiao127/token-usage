export interface HistoryOcSide {
  tokens: number | null;
  users: number | null;
  sessions: number | null;
  costUsd: number | null;
  ids: string[];
}

export interface HistoryOrSide {
  tokens: number | null;
  requests: number | null;
  prompt: number | null;
  completion: number | null;
  byok: number | null;
  permas: string[];
}

export interface HistoryDayModel {
  key: string;
  name: string;
  lab: string;
  labName: string;
  status: 'matched' | 'opencode-only' | 'openrouter-only';
  oc: HistoryOcSide | null;
  or: HistoryOrSide | null;
  combined: number | null;
  priceIn: number | null;
  priceOut: number | null;
  priceCached: number | null;
}

export interface HistoryDayFile {
  schemaVersion: 1;
  /** Primary UTC date this file represents (YYYY-MM-DD). */
  date: string;
  /** Complete UTC day the OpenCode figures cover. Equals date for combined files. */
  ocDate: string;
  /** Complete UTC day the OpenRouter day figures cover. Equals date for combined files. */
  orDate: string;
  archivedAt: string;
  /** True when only one source had data for this date. */
  partial: boolean;
  sources: {
    opencode: { name: string; url: string; asOf: string; citation: string };
    openrouter: { name: string; url: string; asOf: string; license: string };
  };
  totals: {
    opencode: number | null;
    openrouter: number | null;
    combined: number | null;
  };
  match: {
    matched: number;
    opencodeOnly: number;
    openrouterOnly: number;
    opencodeCoverage: number | null;
    openrouterCoverage: number | null;
  };
  models: HistoryDayModel[];
}

export interface HistoryIndexEntry {
  date: string;
  file: string;
  sources: Array<'opencode' | 'openrouter'>;
  partial: boolean;
  totals: {
    opencode: number | null;
    openrouter: number | null;
    combined: number | null;
  };
  modelCount: number;
}

export interface HistoryIndex {
  schemaVersion: 1;
  updatedAt: string;
  days: HistoryIndexEntry[];
}
