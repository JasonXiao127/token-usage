import { MODEL_ALIASES, PROVIDER_ALIAS, normalize, normalizeSlug, splitId, stripVersion } from './aliases.ts';

export interface OcGroup {
  key: string; // lab/base
  lab: string;
  labName: string;
  displayName: string;
  modelIds: string[]; // canonical oc ids in group
  slugs: string[]; // page slugs lab/slug
  twoMonthTokens: number;
  releaseDate: string | null;
  contextTokens: number | null;
  outputTokens: number | null;
  priceIn: number | null;
  priceOut: number | null;
  priceCached: number | null;
  priceWrite: number | null;
}

/** Groups that merge OpenCode variants into one display row. Key: normalized `lab/base`. */
const VARIANT_GROUPS: Array<{ lab: string; bases: string[]; name?: string }> = [
  { lab: 'meta', bases: ['muse-spark-1.3', 'muse-spark-1.3-contributor'] },
  { lab: 'meta', bases: ['muse-spark-1.2', 'muse-spark-1.2-contributor'] },
  { lab: 'google', bases: ['gemini-4-argon', 'gemini-4-argon-contributor'], name: 'Gemini 4 Argon' },
  { lab: 'nvidia', bases: ['nemotron-3-ultra', 'nemotron-3-ultra-550b-a55b'], name: 'Nemotron 3 Ultra' },
  { lab: 'nvidia', bases: ['nemotron-3.5-super-vl', 'nemotron-3.5-super-vl-120b-a12b'], name: 'Nemotron 3.5 Super VL' },
  { lab: 'deepseek', bases: ['deepseek-v4.1-flash', 'deepseek-v4p1-flash'], name: 'DeepSeek V4.1 Flash' },
];

/** Canonical group key for an OpenCode lab + model base. Exported for reuse by the collector (variant paths must stay in sync with VARIANT_GROUPS). */
export function groupKeyFor(lab: string, baseNorm: string): string {
  const labN = normalize(lab);
  for (const g of VARIANT_GROUPS) {
    if (normalize(g.lab) !== labN) continue;
    if (g.bases.map((b) => normalize(b)).includes(baseNorm)) {
      return `${labN}/${normalize(g.bases[0]!)}`;
    }
  }
  return `${labN}/${baseNorm}`;
}

export interface CatalogEntry {
  id: string; // provider/model (original case)
  lab: string;
  labName: string;
  name: string;
  slug: string; // page path lab/slug
  releaseDate: string | null;
  contextTokens: number;
  outputTokens: number;
  tokens: number; // 2-month catalog tokens (may be stale/incomplete)
  priceIn: number | null;
  priceOut: number | null;
  priceCached: number | null;
  priceWrite: number | null;
}

/** Build canonical groups from catalog entries + hidden usage rows. */
export function buildGroups(catalog: CatalogEntry[], hidden: Array<{ lab: string; labName: string; model: string; provider: string; slug: string; tokens: number }>): Map<string, OcGroup> {
  const byKey = new Map<string, OcGroup & { cands: CatalogEntry[] }>();
  const ensure = (key: string, lab: string, labName: string): OcGroup & { cands: CatalogEntry[] } => {
    let g = byKey.get(key);
    if (!g) {
      g = { key, lab, labName, displayName: '', modelIds: [], slugs: [], twoMonthTokens: 0, releaseDate: null, contextTokens: null, outputTokens: null, priceIn: null, priceOut: null, priceCached: null, priceWrite: null, cands: [] };
      byKey.set(key, g);
    }
    return g;
  };

  for (const c of catalog) {
    const [p, s] = splitId(c.id);
    const labN = normalize(c.lab || p);
    const baseN = normalize(s);
    const key = groupKeyFor(labN, baseN);
    const g = ensure(key, c.lab || p, c.labName);
    g.cands.push(c);
    if (!g.modelIds.includes(c.id)) g.modelIds.push(c.id);
    if (c.slug && !g.slugs.includes(c.slug)) g.slugs.push(c.slug);
    // accumulate catalog tokens only for group sizing; real totals come from usage rows
  }

  // hidden usage models not in catalog (or with provider mismatch): create group if absent
  for (const h of hidden) {
    const labN = normalize(h.lab);
    const baseN = normalize(h.model);
    const key = groupKeyFor(labN, baseN);
    const g = ensure(key, h.lab, h.labName);
    if (!g.slugs.includes(`${h.lab}/${h.slug}`)) g.slugs.push(`${h.lab}/${h.slug}`);
  }

  const out = new Map<string, OcGroup>();
  for (const [key, g] of byKey) {
    // display name: longest meaningful candidate name, or hidden model name
    const named = g.cands.slice().sort((a, b) => b.name.length - a.name.length);
    const vg = VARIANT_GROUPS.find((v) => normalize(v.lab) === normalize(g.lab) && key === `${normalize(v.lab)}/${normalize(v.bases[0]!)}`);
    g.displayName = vg?.name || named[0]?.name || key.split('/')[1] || key;
    // base metadata from largest-token candidate, else first
    const meta = g.cands.slice().sort((a, b) => b.tokens - a.tokens)[0];
    if (meta) {
      g.releaseDate = meta.releaseDate;
      g.contextTokens = meta.contextTokens || null;
      g.outputTokens = meta.outputTokens || null;
      g.priceIn = meta.priceIn; g.priceOut = meta.priceOut; g.priceCached = meta.priceCached; g.priceWrite = meta.priceWrite;
    }
    const { cands: _drop, ...rest } = g;
    out.set(key, rest);
  }
  return out;
}

export interface OrBase {
  base: string; // provider/base (version stripped) original case provider + stripped slug
  provider: string;
  slugBase: string; // stripped slug
  ymd: string | null;
  permas: string[]; // full permaslugs aggregated
  tokens: { day: number; week: number; month: number };
  change: number | null;
  requests: { day: number; week: number; month: number };
  prompt: { day: number; week: number; month: number };
  completion: { day: number; week: number; month: number };
  byok: { day: number; week: number; month: number };
  variants: Array<{ variant: string; permaslug: string; tokensWeek: number; change: number | null; requestsWeek: number }>;
}

export function matchOrBase(
  or: OrBase,
  groups: Map<string, OcGroup>,
  catalogById: Map<string, CatalogEntry>,
): { key: string | null; type: 'exact' | 'alias' | 'name' | 'none' } {
  const [rawProv, ...rest] = or.base.split('/');
  const rawSlug = rest.join('/');
  const prov = PROVIDER_ALIAS[normalize(rawProv)] || normalize(rawProv);
  const slugN = normalizeSlug(rawSlug);
  const baseN = normalize(rawSlug);

  // 1. explicit alias on full permaslug base
  for (const perma of or.permas) {
    const b = perma.replace(/-\d{8}$/, '');
    if (MODEL_ALIASES[b]) {
      const target = MODEL_ALIASES[b]!;
      const [tp, ts] = splitId(target);
      const key = `${normalize(tp)}/${normalize(ts)}`;
      // map through variant groups
      const gkey = groupKeyFor(normalize(tp), normalize(ts));
      if (groups.has(gkey)) return { key: gkey, type: 'alias' };
      if (groups.has(key)) return { key, type: 'alias' };
    }
  }
  const aliasDirect = MODEL_ALIASES[`${rawProv}/${rawSlug}`] || MODEL_ALIASES[`${prov}/${rawSlug}`];
  if (aliasDirect) {
    const [tp, ts] = splitId(aliasDirect);
    const gkey = groupKeyFor(normalize(tp), normalize(ts));
    if (groups.has(gkey)) return { key: gkey, type: 'alias' };
  }

  // 2. exact normalized provider/model. provKey is the normalized key
  // namespace (alias values like 'bytedance-seed' keep dashes, but group
  // keys are built with normalize(), so compare normalized).
  const provKey = normalize(prov);
  const exactKey = `${provKey}/${baseN}`;
  if (groups.has(exactKey)) return { key: exactKey, type: 'exact' };
  // try with slug normalization
  const slugKey = `${provKey}/${normalize(slugN)}`;
  if (groups.has(slugKey)) return { key: slugKey, type: 'exact' };

  // 3. version-stripped base match + date-aware selection among group candidates
  const stripped = stripVersion(rawSlug);
  if (stripped.ymd) {
    const skey = groupKeyFor(prov, normalize(stripped.base));
    if (groups.has(skey)) return { key: skey, type: 'exact' };
  }

  // 4. catalog id match (handles case differences like MiniMax/MiniMax-M3.1-Flash)
  const catHit = catalogById.get(normalize(`${prov}/${rawSlug}`)) || catalogById.get(normalize(`${rawProv}/${rawSlug}`));
  if (catHit) {
    const [cp, cs] = splitId(catHit.id);
    const gkey = groupKeyFor(normalize(cp), normalize(cs));
    if (groups.has(gkey)) return { key: gkey, type: 'exact' };
  }

  return { key: null, type: 'none' };
}
