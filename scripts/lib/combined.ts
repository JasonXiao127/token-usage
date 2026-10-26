import type { CombinedUsage, Metric, TokenSet } from '../../shared/types.ts';

export interface SideUsage {
  tokens: TokenSet;
  changeWeek: number | null;
  changeIsNew?: boolean;
}

/** Add two optional token counts. Null only when both sides are unknown. */
export function addOpt(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

/**
 * Previous-week tokens implied by current tokens plus a reported WoW change.
 * Returns null when the previous value is unknowable (missing change with
 * nonzero current usage, or a change <= -100%).
 */
export function prevTokens(
  cur: number | null | undefined,
  change: number | null | undefined,
  isNew?: boolean,
): number | null {
  const c = cur ?? 0;
  if (isNew) return 0;
  if (change == null || !isFinite(change)) return c === 0 ? 0 : null;
  if (change <= -1) return null;
  return c / (1 + change);
}

const METRICS: Metric[] = ['day', 'week', 'month'];

function hasUsage(t: TokenSet | undefined): boolean {
  if (!t) return false;
  return (t.day ?? 0) + (t.week ?? 0) + (t.month ?? 0) > 0;
}

/**
 * Combined observed usage for one model: OpenCode + OpenRouter.
 * Change is derived only when both sides' previous-week values are known;
 * otherwise it stays null rather than guessing.
 */
export function combinedUsage(
  oc: SideUsage | null,
  or: SideUsage | null,
  totals: { opencode: TokenSet; openrouter: TokenSet },
): CombinedUsage {
  const tokens = {
    day: addOpt(oc?.tokens.day, or?.tokens.day),
    week: addOpt(oc?.tokens.week, or?.tokens.week),
    month: addOpt(oc?.tokens.month, or?.tokens.month),
  } satisfies TokenSet;
  const share = {
    day: null as number | null,
    week: null as number | null,
    month: null as number | null,
  };
  for (const m of METRICS) {
    const t = (totals.opencode[m] ?? 0) + (totals.openrouter[m] ?? 0);
    const c = tokens[m];
    share[m] = t > 0 && c != null ? (c / t) * 100 : null;
  }

  const ocPrev = prevTokens(oc?.tokens.week, oc?.changeWeek, oc?.changeIsNew);
  const orPrev = prevTokens(or?.tokens.week, or?.changeWeek);
  const curW = (oc?.tokens.week ?? 0) + (or?.tokens.week ?? 0);
  let changeWeek: number | null = null;
  let changeIsNew = false;
  if (curW > 0 && ocPrev != null && orPrev != null) {
    const prev = ocPrev + orPrev;
    if (prev <= 0) changeIsNew = true;
    else changeWeek = curW / prev - 1;
  }
  return {
    tokens,
    share,
    changeWeek,
    ...(changeIsNew ? { changeIsNew: true as const } : {}),
    opencode: hasUsage(oc?.tokens),
    openrouter: hasUsage(or?.tokens),
  };
}
