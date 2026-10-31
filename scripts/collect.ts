import fs from 'node:fs/promises';
import path from 'node:path';
import { fetchIndex, fetchLabs, fetchLabList, fetchLabUsageHtml, fetchDetails, type OcLab, type OcDetail } from './lib/opencode.ts';
import { fetchCatalog, fetchRankings, rankDate, rankTokensExclByok, type OrCatalogModel, type OrRankRow } from './lib/openrouter.ts';
import { buildGroups, groupKeyFor, matchOrBase, type CatalogEntry, type OrBase } from './lib/match.ts';
import { prettyLabName, catalogArchFor } from './lib/labs.ts';
import { combinedUsage } from './lib/combined.ts';
import { normalize, normalizeSlug, splitId, stripVersion, PROVIDER_ALIAS } from './lib/aliases.ts';
import type { DataFile, ModelRow, DailyPoint } from '../shared/types.ts';

const OUT = 'public/data/usage.json';
const REPORT = 'reports/match-report.md';

function addDays(base: string, n: number): string {
  const d = new Date(base + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function rangeDays(end: string, n: number): string[] {
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}
function sumDaily(daily: DailyPoint[], dates: Set<string>): number {
  let s = 0;
  for (const d of daily) if (dates.has(d.date)) s += d.tokens;
  return s;
}
function isExcludedUsageModel(rawModel: string): boolean {
  const m = rawModel.toLowerCase();
  return m === 'test' || m.startsWith('test') || m.startsWith('community/') || m.startsWith('ocz/') || m.startsWith('coding-') || m.includes('-test') || m.startsWith('test-') || m.startsWith('test_');
}
function cleanBase(lab: string, rawModel: string, catalogBases?: Set<string>): string {
  let m = rawModel;
  if (m.includes('/')) m = m.split('/').pop()!;
  const slug = normalizeSlug(m);
  // Only strip a duplicated provider prefix when the remainder is a known
  // catalog base for this lab (e.g. xiaomi-mimo-v2.6-pro -> mimo-v2.6-pro).
  // Never strip blindly: deepseek-v4.1-flash must keep its prefix.
  if (catalogBases) {
    const labN = normalize(lab);
    const prefixes = new Set<string>([labN, PROVIDER_ALIAS[labN] || '']);
    for (const [k, v] of Object.entries(PROVIDER_ALIAS)) {
      if (v === labN) prefixes.add(normalize(k));
    }
    for (const p of prefixes) {
      if (!p) continue;
      // slug-space match (p keeps dashes, e.g. 'aion-labs')
      if (slug.toLowerCase().startsWith(p + '-')) {
        const stripped = slug.slice(p.length + 1);
        if (stripped && catalogBases.has(`${labN}/${normalize(stripped)}`)) return stripped;
        continue;
      }
      // normalize-space match (p is dashless, e.g. 'aionlabs'): slice in the
      // same representation so the result cannot start mid-separator
      const nslug = normalize(slug);
      if (nslug.startsWith(p)) {
        const stripped = nslug.slice(p.length);
        if (stripped && catalogBases.has(`${labN}/${stripped}`)) return stripped;
      }
    }
  }
  return slug;
}

function orPriceFor(base: string, cat: Map<string, OrCatalogModel>) {
  const cands = [base, base + ':free'];
  for (const k of cands) {
    const c = cat.get(k);
    if (c?.pricing) {
      const num = (v: string | undefined): number | null => {
        if (v == null) return null;
        const f = parseFloat(v);
        if (!isFinite(f) || f < 0) return f === 0 ? 0 : null;
        return f * 1e6;
      };
      return { input: num(c.pricing.prompt), output: num(c.pricing.completion), cached: num(c.pricing.input_cache_read) };
    }
  }
  for (const [k, c] of cat) {
    if (k.replace(/:free$/, '').replace(/-\d{8}$/, '') === base) {
      const num = (v: string | undefined): number | null => {
        if (v == null) return null;
        const f = parseFloat(v);
        if (!isFinite(f) || f < 0) return f === 0 ? 0 : null;
        return f * 1e6;
      };
      return { input: num(c.pricing.prompt), output: num(c.pricing.completion), cached: num(c.pricing.input_cache_read) };
    }
  }
  return { input: null as number | null, output: null as number | null, cached: null as number | null };
}

async function main() {
  const t0 = Date.now();
  const warnings: string[] = [];
  console.log('fetch index + labs...');
  const index = await fetchIndex();
  const labIds = await fetchLabList();
  console.log(`labs: ${labIds.length}`);
  const { labs, failures: labFail } = await fetchLabs(labIds);
  if (labFail.length) warnings.push(`lab JSON failures: ${labFail.map((f) => f.lab).join(', ')}`);
  console.log(`lab JSON ok: ${Object.keys(labs).length}, fail: ${labFail.length}`);

  // labs with usage
  const labsWithUsage = Object.entries(labs).filter(([, d]) => (d.usage?.tokens ?? 0) > 0).map(([k]) => k);
  console.log(`labs with usage: ${labsWithUsage.length}`);
  const { usage: labUsage, failures: htmlFail } = await fetchLabUsageHtml(labsWithUsage);
  if (htmlFail.length) warnings.push(`lab HTML failures: ${htmlFail.map((f) => f.lab).join(', ')}`);
  console.log(`lab HTML ok: ${Object.keys(labUsage).length}`);

  // validate lab sums
  let parsedUsageRows = 0;
  for (const [lab, u] of Object.entries(labUsage)) {
    const d = labs[lab]!;
    const sum = u.rows.reduce((s, r) => s + r.tokens, 0);
    const total = d.usage!.tokens;
    const diff = Math.abs(sum - total) / Math.max(1, total);
    if (diff > 0.001) warnings.push(`${lab}: usage HTML sum ${(sum / 1e12).toFixed(2)}T != lab total ${(total / 1e12).toFixed(2)}T (diff ${(diff * 100).toFixed(2)}%)`);
    parsedUsageRows += u.rows.length;
  }
  console.log(`usage rows: ${parsedUsageRows}`);

  // Build catalog entries
  const catalog: CatalogEntry[] = [];
  const labNameById = new Map<string, string>();
  for (const [labId, d] of Object.entries(labs)) {
    labNameById.set(labId, d.lab?.name || labId);
    for (const m of d.models || []) {
      const price = await Promise.resolve(null); // placeholder
      void price;
      catalog.push({
        id: m.id, lab: labId, labName: d.lab?.name || labId, name: m.name,
        slug: m.page.replace('https://opencode.ai/data/', ''),
        releaseDate: m.releaseDate, contextTokens: m.contextTokens, outputTokens: m.outputTokens,
        tokens: m.tokens, priceIn: null, priceOut: null, priceCached: null, priceWrite: null,
      });
    }
  }
  const catalogById = new Map<string, CatalogEntry>();
  for (const c of catalog) catalogById.set(normalize(c.id), c);

  // Hidden usage rows (not in catalog by normalized provider/model)
  const catIds = new Set(catalog.map((c) => normalize(c.id)));
  const catalogBases = new Set(catalog.map((c) => { const [p, s] = splitId(c.id); return `${normalize(p)}/${normalize(s)}`; }));
  const hidden = [];
  const usageRowList: Array<{ lab: string; labName: string; model: string; provider: string; slug: string; tokens: number; share: number; excluded: boolean }> = [];
  for (const [lab, u] of Object.entries(labUsage)) {
    const labName = labs[lab]?.lab?.name || lab;
    for (const r of u.rows) {
      const excluded = isExcludedUsageModel(r.model);
      const cleaned = cleanBase(lab, r.model, catalogBases);
      const normId = normalize(`${lab}/${cleaned}`);
      // resolve page slug: prefer modelPaths by catalog id or usage slug
      const mp = u.modelPaths;
      let pageSlug = `${lab}/${r.slug}`;
      // find catalog-style key in modelPaths
      for (const [k, v] of Object.entries(mp)) {
        if (normalize(k) === normalize(`${r.provider}/${r.model}`) || normalize(k) === normId || normalize(v.replace('/data/', '')) === normalize(`${lab}/${r.slug}`)) {
          pageSlug = (v as string).replace(/^\/data\//, '');
          break;
        }
      }
      usageRowList.push({ lab, labName, model: r.model, provider: r.provider, slug: pageSlug.split('/').slice(1).join('/') || r.slug, tokens: r.tokens, share: r.share, excluded });
      if (!catIds.has(normId) && !catIds.has(normalize(`${r.provider}/${r.model}`))) {
        hidden.push({ lab, labName, model: cleaned, provider: r.provider, slug: pageSlug.split('/').slice(1).join('/') || r.slug, tokens: r.tokens });
      }
    }
  }
  console.log(`hidden usage models: ${hidden.length}`);

  const groups = buildGroups(catalog, hidden.map((h) => ({ ...h, model: h.model })));
  // leaderboard-only models (e.g. unknown/iceman) have no lab page: seed groups.
  // groupKeyFor keeps variant spellings on their canonical group instead of
  // spawning duplicate zero-usage rows.
  for (const m of ((index.leaderboard.pastWeek as Array<{ model: string; name: string; lab: string; page: string; tokens: number }>) || [])) {
    const slug = m.page.replace('https://opencode.ai/data/', '');
    if (!slug || slug.split('/').length !== 2) continue;
    const [ll, ...rest] = slug.split('/');
    const base = rest.join('/');
    const key = groupKeyFor(normalize(ll!), normalize(base));
    if (!groups.has(key)) {
      const labName = labs[ll!]?.lab?.name || labNameById.get(ll!) || (m.lab && m.lab !== 'unknown' ? m.lab[0]!.toUpperCase() + m.lab.slice(1) : 'Unknown');
      groups.set(key, {
        key, lab: ll!, labName,
        displayName: m.name, modelIds: [], slugs: [slug],
        twoMonthTokens: 0, releaseDate: null, contextTokens: null, outputTokens: null,
        priceIn: null, priceOut: null, priceCached: null, priceWrite: null,
      });
    }
  }
  console.log(`groups: ${groups.size}`);

  // attach 2-month tokens from usage rows to groups
  const twoMonthByGroup = new Map<string, number>();
  for (const r of usageRowList) {
    if (r.excluded) continue;
    const cleaned = cleanBase(r.lab, r.model, catalogBases);
    // single source of truth for variant grouping lives in match.ts
    const key = groupKeyFor(normalize(r.lab), normalize(cleaned));
    twoMonthByGroup.set(key, (twoMonthByGroup.get(key) || 0) + r.tokens);
  }
  for (const [key, g] of groups) {
    g.twoMonthTokens = twoMonthByGroup.get(key) || 0;
  }

  // detail slugs: meaningful usage rows (non-excluded, tokens>1M) + top leaderboard
  const meaningful = usageRowList.filter((r) => !r.excluded && r.tokens > 1_000_000);
  const detailSlugs = [...new Set(meaningful.map((r) => `${r.lab}/${r.slug}`))];
  // safety net: leaderboard pages
  for (const m of (index.leaderboard.pastWeek as Array<{ page: string }>) || []) {
    const slug = m.page.replace('https://opencode.ai/data/', '');
    if (slug && !detailSlugs.includes(slug) && slug.split('/').length === 2) detailSlugs.push(slug);
  }
  console.log(`detail slugs: ${detailSlugs.length}`);
  const { details, failures: detFail } = await fetchDetails(detailSlugs);
  if (detFail.length) warnings.push(`detail failures (${detFail.length}): ${detFail.slice(0, 10).map((f) => f.slug).join(', ')}`);
  console.log(`details ok: ${Object.keys(details).length}, fail: ${detFail.length}`);

  // validate details vs usage rows
  const detailByGroup = new Map<string, OcDetail[]>();
  for (const [slug, d] of Object.entries(details)) {
    const lab = slug.split('/')[0]!;
    // find group via model id or slug
    const mid = d.model.id; // e.g. meta/muse-spark-1.3-contributor
    const [mp, ms] = splitId(mid);
    let key = `${normalize(mp)}/${normalize(ms)}`;
    if (!groups.has(key)) {
      // try slug
      const sslug = slug.split('/').slice(1).join('/');
      key = `${normalize(lab)}/${normalize(cleanBase(lab, sslug, catalogBases))}`;
    }
    // variant remap (single source of truth: VARIANT_GROUPS in match.ts)
    const tail = key.split('/')[1] || '';
    key = groupKeyFor(normalize(lab), tail);
    if (!groups.has(key)) { warnings.push(`detail ${slug} (${mid}) -> no group ${key}`); continue; }
    if (!detailByGroup.has(key)) detailByGroup.set(key, []);
    detailByGroup.get(key)!.push(d);
  }

  // OpenRouter
  console.log('fetch openrouter...');
  const orCatalog: OrCatalogModel[] = await fetchCatalog();
  const [dayRows, weekRows, monthRows] = await Promise.all([fetchRankings('day'), fetchRankings('week'), fetchRankings('month')]);
  const latestDay = [...new Set(dayRows.map(rankDate))].sort().at(-1)!;
  const latestWeek = [...new Set(weekRows.map(rankDate))].sort().at(-1)!;
  const latestMonth = [...new Set(monthRows.map(rankDate))].sort().at(-1)!;
  console.log(`OR latest: day=${latestDay} week=${latestWeek} month=${latestMonth}`);

  // aggregate OR by permaslug+variant per view
  type Agg = { tokens: number; change: number | null; requests: number; prompt: number; completion: number; byok: number };
  function aggView(rows: OrRankRow[], latest: string): Map<string, Agg & { row: OrRankRow }> {
    const m = new Map<string, Agg & { row: OrRankRow }>();
    for (const r of rows) {
      if (rankDate(r) !== latest) continue;
      const k = r.variant_permaslug;
      const t = rankTokensExclByok(r);
      const cur = m.get(k);
      if (!cur) m.set(k, { tokens: t, change: r.change, requests: r.count, prompt: r.total_prompt_tokens, completion: r.total_completion_tokens, byok: (r.total_byok_prompt_tokens || 0) + (r.total_byok_completion_tokens || 0), row: r });
      else { cur.tokens += t; cur.requests += r.count; cur.prompt += r.total_prompt_tokens; cur.completion += r.total_completion_tokens; cur.byok += (r.total_byok_prompt_tokens || 0) + (r.total_byok_completion_tokens || 0); }
    }
    return m;
  }
  const dayAgg = aggView(dayRows, latestDay);
  const weekAgg = aggView(weekRows, latestWeek);
  const monthAgg = aggView(monthRows, latestMonth);

  // group OR variants by base (strip 8-digit date suffix only for grouping display)
  const orBases = new Map<string, OrBase>();
  const allPermas = new Set<string>([...dayAgg.keys(), ...weekAgg.keys(), ...monthAgg.keys()]);
  // Drop ranking rows whose permaslug has no provider prefix (e.g. bare
  // 'qwen3-embedding-8b'): no lab can be attributed and the OR catalog has
  // no entry to resolve one. Warn only when real tokens are skipped so a
  // zero-token anomaly row doesn't nag on every run.
  for (const vp of [...allPermas]) {
    const basePerma = vp.split(':')[0]!;
    const segs = basePerma.split('/');
    if (!basePerma || !basePerma.includes('/') || !segs[0] || !segs.slice(1).join('/')) {
      const skipped = (dayAgg.get(vp)?.tokens || 0) + (weekAgg.get(vp)?.tokens || 0) + (monthAgg.get(vp)?.tokens || 0);
      if (skipped > 0) warnings.push(`OR ranking permaslug without provider: ${JSON.stringify(vp)} (${skipped} tokens skipped, cannot attribute a lab)`);
      allPermas.delete(vp);
      dayAgg.delete(vp); weekAgg.delete(vp); monthAgg.delete(vp);
    }
  }
  for (const vp of allPermas) {
    const basePerma = vp.split(':')[0]!;
    const [prov, ...rest] = basePerma.split('/');
    const slugFull = rest.join('/');
    const { base, ymd } = stripVersion(slugFull);
    const key = `${prov}/${base}`;
    let b = orBases.get(key);
    if (!b) {
      b = { base: key, provider: prov!, slugBase: base, ymd, permas: [], tokens: { day: 0, week: 0, month: 0 }, change: null, requests: { day: 0, week: 0, month: 0 }, prompt: { day: 0, week: 0, month: 0 }, completion: { day: 0, week: 0, month: 0 }, byok: { day: 0, week: 0, month: 0 }, variants: [] };
      orBases.set(key, b);
    }
    if (!b.permas.includes(basePerma)) b.permas.push(basePerma);
  }
  // fill tokens per view: attribute variant_permaslug rows to base key
  function fill(agg: Map<string, Agg & { row: OrRankRow }>, view: 'day' | 'week' | 'month') {
    for (const [vp, a] of agg) {
      const basePerma = vp.split(':')[0]!;
      const [prov, ...rest] = basePerma.split('/');
      const { base } = stripVersion(rest.join('/'));
      const key = `${prov}/${base}`;
      const b = orBases.get(key)!;
      b.tokens[view] += a.tokens;
      b.requests[view] += a.requests;
      b.prompt[view] += a.prompt;
      b.completion[view] += a.completion;
      b.byok[view] += a.byok;
      if (view === 'week') {
        b.variants.push({ variant: (a.row.variant as 'standard' | 'free' | 'batch') || 'standard', permaslug: basePerma, tokensWeek: a.tokens, change: a.change, requestsWeek: a.requests });
        if (a.change != null && (b.change == null || Math.abs(a.tokens) > 0)) {
          // keep change of largest variant
          const largest = b.variants.slice().sort((x, y) => y.tokensWeek - x.tokensWeek)[0]!;
          b.change = largest.change;
        }
      }
    }
  }
  fill(dayAgg, 'day'); fill(weekAgg, 'week'); fill(monthAgg, 'month');

  // OR catalog lookup
  const orCatById = new Map<string, OrCatalogModel>();
  for (const m of orCatalog) orCatById.set(m.id, m);
  const orPrice = (id: string): { input: number | null; output: number | null; cached: number | null } => {
    const cands = [id, id + ':free', ...[...orCatById.keys()].filter((k) => k.replace(/:free$/, '') === id)];
    for (const k of cands) {
      const c = orCatById.get(k);
      if (c?.pricing) {
        const num = (v: string | undefined): number | null => {
          if (v == null) return null;
          const f = parseFloat(v);
          if (!isFinite(f) || f < 0) return f === 0 ? 0 : null;
          return f * 1e6;
        };
        return { input: num(c.pricing.prompt), output: num(c.pricing.completion), cached: num(c.pricing.input_cache_read) };
      }
    }
    return { input: null, output: null, cached: null };
  };

  // window: latest common complete date
  // OC daily last date may be partial today; use min(latestWeek OR date, latest OC complete date)
  const ocLastDaily = [...new Set(Object.values(details).flatMap((d) => d.usage.daily.map((x) => x.date)))].sort().at(-1) || index.dailyTokens.at(-1)!.date;
  // OC complete date = day before max if max looks partial (total < 50% of prev 7d avg)? simpler: use second-to-last if last total is much smaller
  const totals = index.dailyTokens.map((d) => ({ date: d.date, total: d.total })).sort((a, b) => a.date.localeCompare(b.date));
  let ocEnd = totals.at(-1)!.date;
  const prev7 = totals.slice(-8, -1).map((x) => x.total);
  const avg7 = prev7.reduce((s, x) => s + x, 0) / Math.max(1, prev7.length);
  if (totals.at(-1)!.total < avg7 * 0.5) ocEnd = totals.at(-2)!.date;
  const end = [ocEnd, latestWeek, latestDay].sort()[0]!; // earliest = common complete
  // Actually OR week latest is a single date representing week; day latest similar. Use min of ocEnd and OR latest dates.
  const windowEnd = [ocEnd, latestWeek].sort()[0]!;
  const day = windowEnd, weekStart = addDays(windowEnd, -6), monthStart = addDays(windowEnd, -29);
  const weekDates = new Set(rangeDays(windowEnd, 7));
  const prevWeekDates = new Set(rangeDays(addDays(windowEnd, -7), 7));
  const monthDates = new Set(rangeDays(windowEnd, 30));
  console.log(`window end=${windowEnd} (ocEnd=${ocEnd} ocLast=${ocLastDaily} orWeek=${latestWeek} orDay=${latestDay})`);

  // OC global totals from index dailyTokens
  const ocTotal = (dates: Set<string>): number => index.dailyTokens.filter((d) => dates.has(d.date)).reduce((s, d) => s + d.total, 0);
  const ocDay = ocTotal(new Set([day])), ocWeek = ocTotal(weekDates), ocMonth = ocTotal(monthDates);
  const orDayTotal = [...dayAgg.values()].reduce((s, a) => s + a.tokens, 0);
  const orWeekTotal = [...weekAgg.values()].reduce((s, a) => s + a.tokens, 0);
  const orMonthTotal = [...monthAgg.values()].reduce((s, a) => s + a.tokens, 0);

  // Build model rows
  const models: ModelRow[] = [];
  const EMPTY_COMBINED = {
    tokens: { day: null, week: null, month: null },
    share: { day: null, week: null, month: null },
    changeWeek: null,
    opencode: false,
    openrouter: false,
  };
  const matchedKeys = new Set<string>();
  const orMatch: Array<{ orKey: string; ocKey: string | null; type: string }> = [];
  for (const [orKey, b] of orBases) {
    if (b.tokens.week === 0 && b.tokens.day === 0 && b.tokens.month === 0) continue; // skip zero-usage OR rows? keep if matched? skip for size
    const m = matchOrBase(b, groups, catalogById);
    orMatch.push({ orKey, ocKey: m.key, type: m.type });
    if (m.key) matchedKeys.add(m.key);
  }

  const allKeys = new Set<string>([...groups.keys()].filter((k) => (twoMonthByGroup.get(k) || 0) > 0 || (detailByGroup.get(k)?.length || 0) > 0));
  // also include catalog zero-usage? include all catalog groups for "show all" (size ~600). Include them with null usage.
  for (const k of groups.keys()) allKeys.add(k);
  for (const o of orMatch) {
    if (!o.ocKey) {
      // OR-only pseudo key
      allKeys.add(`OR:${o.orKey}`);
    }
  }

  // rank OC groups by week tokens (computed from details)
  const ocWeekByGroup = new Map<string, { w: number; p: number; m: number; daily: DailyPoint[] }>();
  for (const [key, dets] of detailByGroup) {
    const merged = new Map<string, DailyPoint>();
    for (const d of dets) {
      for (const p of d.usage.daily) {
        const cur = merged.get(p.date) || { date: p.date, tokens: 0, users: 0, sessions: 0, costUsd: 0 };
        cur.tokens += p.tokens; cur.users = (cur.users || 0) + p.uniqueUsers; cur.sessions = (cur.sessions || 0) + p.sessions; cur.costUsd = (cur.costUsd || 0) + p.costUsd;
        merged.set(p.date, cur);
      }
    }
    const daily = [...merged.values()].sort((a, b) => a.date.localeCompare(b.date));
    ocWeekByGroup.set(key, { w: sumDaily(daily, weekDates), p: sumDaily(daily, prevWeekDates), m: sumDaily(daily, monthDates), daily });
  }

  const sortedOcKeys = [...ocWeekByGroup.entries()].sort((a, b) => b[1].w - a[1].w);
  const rankByKey = new Map<string, number>();
  sortedOcKeys.forEach(([k], i) => rankByKey.set(k, i + 1));

  const orByOcKey = new Map<string, OrBase[]>();
  for (const o of orMatch) {
    if (!o.ocKey) continue;
    if (!orByOcKey.has(o.ocKey)) orByOcKey.set(o.ocKey, []);
    orByOcKey.get(o.ocKey)!.push(orBases.get(o.orKey)!);
  }

  const orOnlyBases = [...orBases.values()].filter((b) => {
    const m = orMatch.find((x) => x.orKey === b.base);
    return (!m || !m.ocKey) && (b.tokens.week > 0 || b.tokens.day > 0);
  });

  const labNameOf = (lab: string): string => labs[lab]?.lab?.name || labNameById.get(lab) || lab;

  /** Display name for a lab id (shared pure helper; known OC name wins). */
  const prettyName = (labId: string, prov: string): string => prettyLabName(labId, prov, labNameOf(labId));

  for (const key of allKeys) {
    if (key.startsWith('OR:')) {
      const orKey = key.slice(3);
      const b = orBases.get(orKey)!;
      const [prov] = orKey.split('/');
      const cat = orCatById.get(orKey) || orCatById.get(orKey + ':free');
      const labId = PROVIDER_ALIAS[normalize(prov!)] || normalize(prov!);
      const price = orPriceFor(orKey, orCatById);
      const share = {
        day: orDayTotal ? (b.tokens.day / orDayTotal) * 100 : null,
        week: orWeekTotal ? (b.tokens.week / orWeekTotal) * 100 : null,
        month: orMonthTotal ? (b.tokens.month / orMonthTotal) * 100 : null,
      };
      models.push({
        key: `or:${normalize(orKey)}`,
        name: cat?.name?.replace(/^[^:]+:\s*/, '') || orKey.split('/').slice(1).join('/') || orKey,
        lab: labId, labName: prettyName(labId, prov!),
        modalities: [...(cat?.architecture?.input_modalities || []), ...(cat?.architecture?.output_modalities || [])],
        meta: {
          name: cat?.name || orKey, lab: labId, labName: prettyName(labId, prov!),
          contextTokens: cat?.context_length ?? null, outputTokens: cat?.top_provider?.max_completion_tokens ?? null,
          releaseDate: null, knowledgeCutoff: cat?.knowledge_cutoff ?? null,
          inputModalities: cat?.architecture?.input_modalities || [], outputModalities: cat?.architecture?.output_modalities || [],
          reasoning: null, toolCall: null, openWeights: null,
          pricing: null, orPricing: { input: price.input, output: price.output, cachedInput: price.cached, cacheWrite: null },
          opencodePage: null, openrouterPage: `https://openrouter.ai/${b.permas[0] || orKey}`,
        },
        opencode: null,
        openrouter: {
          tokens: { ...b.tokens },
          share,
          changeWeek: b.change != null ? b.change : null,
          variants: b.variants.map((v) => ({
            variant: (v.variant === 'free' || v.variant === 'batch' ? v.variant : 'standard') as 'standard' | 'free' | 'batch', permaslug: v.permaslug,
            tokens: { day: dayAgg.get(v.permaslug + ':standard')?.tokens ?? dayAgg.get(v.permaslug + ':free')?.tokens ?? dayAgg.get(v.permaslug + ':batch')?.tokens ?? null as unknown as number, week: v.tokensWeek, month: monthAgg.get(v.permaslug + ':standard')?.tokens ?? monthAgg.get(v.permaslug + ':free')?.tokens ?? monthAgg.get(v.permaslug + ':batch')?.tokens ?? null as unknown as number },
            changeWeek: v.change,
            requests: { day: null, week: v.requestsWeek, month: null },
            promptTokens: { day: null, week: null, month: null },
            completionTokens: { day: null, week: null, month: null },
            byokTokens: { day: null, week: null, month: null },
          })),
          requests: { ...b.requests }, promptTokens: { ...b.prompt }, completionTokens: { ...b.completion }, byokTokens: { ...b.byok },
          matchType: 'none',
        },
        combined: EMPTY_COMBINED,
        status: 'openrouter-only', stale: false,
      });
      continue;
    }
    const g = groups.get(key)!;
    if (!g) continue;
    const oc = ocWeekByGroup.get(key);
    const orList = orByOcKey.get(key) || [];
    const hasOcUsage = (g.twoMonthTokens || 0) > 0 || (oc?.w || 0) > 0;
    const hasOrUsage = orList.some((b) => b.tokens.week > 0 || b.tokens.day > 0);
    if (!hasOcUsage && !hasOrUsage) {
      // zero-usage catalog row
      const meta0 = catalog.find((c) => `${normalize(c.lab)}/${normalize(splitId(c.id)[1])}` === key || `${normalize(splitId(c.id)[0])}/${normalize(splitId(c.id)[1])}` === key);
      models.push({
        key: `oc:${key}`,
        name: g.displayName, lab: g.lab, labName: g.labName,
        modalities: [],
        meta: {
          name: g.displayName, lab: g.lab, labName: g.labName,
          contextTokens: g.contextTokens, outputTokens: g.outputTokens, releaseDate: g.releaseDate, knowledgeCutoff: null,
          inputModalities: [], outputModalities: [], reasoning: null, toolCall: null, openWeights: null,
          pricing: g.priceIn != null || g.priceOut != null ? { input: g.priceIn, output: g.priceOut, cachedInput: g.priceCached, cacheWrite: g.priceWrite } : null,
          orPricing: null,
          opencodePage: g.slugs[0] ? `https://opencode.ai/data/${g.slugs[0]}` : null,
          openrouterPage: null,
        },
        opencode: { tokens: { day: 0, week: 0, month: 0 }, twoMonthTokens: 0, share: { day: 0, week: 0, month: 0 }, changeWeek: null, daily: [], variants: [], uniqueUsers: null, sessions: null, costUsd: null, cachedInputPercent: null, weeklyRetentionPercent: null, rankWeek: null, detailAvailable: false },
        openrouter: null,
        combined: EMPTY_COMBINED,
        status: 'opencode-only', stale: false,
      });
      void meta0;
      continue;
    }
    const dets = detailByGroup.get(key) || [];
    const primary = dets.slice().sort((a, b) => b.usage.tokens - a.usage.tokens)[0];
    // OR catalog modality fallback: OpenCode detail pages often omit
    // modalities while the OR catalog has them. OpenCode stays authoritative.
    const ocIn = primary?.model.inputModalities || [];
    const ocOut = primary?.model.outputModalities || [];
    const orArch = (!ocIn.length || !ocOut.length) && orList.length
      ? catalogArchFor(orCatById, orList[0]!)
      : null;
    const inMods = ocIn.length ? ocIn : (orArch?.input || []);
    const outMods = ocOut.length ? ocOut : (orArch?.output || []);
    const daily = oc?.daily || [];
    const w = oc?.w ?? null, mth = oc?.m ?? null;
    const d0 = day ? (daily.find((x) => x.date === day)?.tokens ?? null) : null;
    const prev = oc?.p ?? 0;
    let changeWeek: number | null = null; let isNew = false;
    if (w != null) {
      if (prev === 0 && w > 0) { isNew = true; changeWeek = null; }
      else if (prev > 0) changeWeek = (w - prev) / prev;
    }
    const share = {
      day: d0 != null && ocDay ? (d0 / ocDay) * 100 : null,
      week: w != null && ocWeek ? (w / ocWeek) * 100 : null,
      month: mth != null && ocMonth ? (mth / ocMonth) * 100 : null,
    };
    // OR aggregate
    const orTokens = {
      day: orList.reduce((s, b) => s + b.tokens.day, 0),
      week: orList.reduce((s, b) => s + b.tokens.week, 0),
      month: orList.reduce((s, b) => s + b.tokens.month, 0),
    };
    const hasOr = orList.length > 0 && (orTokens.week > 0 || orTokens.day > 0 || orTokens.month > 0);
    const orShare = {
      day: orDayTotal && hasOr ? (orTokens.day / orDayTotal) * 100 : null,
      week: orWeekTotal && hasOr ? (orTokens.week / orWeekTotal) * 100 : null,
      month: orMonthTotal && hasOr ? (orTokens.month / orMonthTotal) * 100 : null,
    };
    const orChange = orList.length ? (orList.slice().sort((a, b) => b.tokens.week - a.tokens.week)[0]!.change) : null;
    const orP = orList.length ? orPriceFor(orList[0]!.base, orCatById) : { input: null as number | null, output: null as number | null, cached: null as number | null };
    const stale = dets.length > 0 && dets.every((x) => x.usage.daily.at(-1)!.date < windowEnd);
    const variants = dets.map((x) => {
      const vd = x.usage.daily;
      const toDaily = (p: { date: string; tokens: number; uniqueUsers: number; sessions: number; costUsd: number }): DailyPoint => ({ date: p.date, tokens: p.tokens, users: p.uniqueUsers, sessions: p.sessions, costUsd: p.costUsd });
      return {
        id: x.model.id, slug: x.page.replace('https://opencode.ai/data/', ''), name: x.model.name,
        tokens: { day: vd.find((p) => p.date === day)?.tokens ?? null, week: sumDaily(vd.map(toDaily), weekDates), month: sumDaily(vd.map(toDaily), monthDates) },
        twoMonthTokens: x.usage.tokens, daily: vd.map((p) => ({ date: p.date, tokens: p.tokens, users: p.uniqueUsers, sessions: p.sessions, costUsd: p.costUsd })),
        pageUrl: x.page, stale: x.usage.daily.at(-1)!.date < windowEnd,
      };
    });
    models.push({
      key: `oc:${key}`,
      name: g.displayName, lab: g.lab, labName: g.labName,
      modalities: [...inMods, ...outMods],
      meta: {
        name: g.displayName, lab: g.lab, labName: g.labName,
        contextTokens: primary?.model.contextTokens ?? g.contextTokens, outputTokens: primary?.model.outputTokens ?? g.outputTokens,
        releaseDate: primary?.model.releaseDate ?? g.releaseDate, knowledgeCutoff: primary?.model.knowledgeCutoff ?? null,
        inputModalities: inMods, outputModalities: outMods,
        reasoning: primary?.model.reasoning ?? null, toolCall: primary?.model.toolCall ?? null, openWeights: primary?.model.openWeights ?? null,
        pricing: primary?.model.priceUsdPer1M ? { input: primary.model.priceUsdPer1M.input, output: primary.model.priceUsdPer1M.output, cachedInput: primary.model.priceUsdPer1M.cachedInput, cacheWrite: primary.model.priceUsdPer1M.cacheWrite } : (g.priceIn != null ? { input: g.priceIn, output: g.priceOut, cachedInput: g.priceCached, cacheWrite: g.priceWrite } : null),
        orPricing: hasOr ? { input: orP.input, output: orP.output, cachedInput: orP.cached, cacheWrite: null } : null,
        opencodePage: g.slugs[0] ? `https://opencode.ai/data/${g.slugs[0]}` : null,
        openrouterPage: orList[0] ? `https://openrouter.ai/${orList[0].permas[0]}` : null,
      },
      opencode: {
        tokens: { day: d0, week: w, month: mth },
        twoMonthTokens: g.twoMonthTokens,
        share, changeWeek, changeIsNew: isNew,
        daily: daily.map((p) => ({ date: p.date, tokens: p.tokens, users: p.users, sessions: p.sessions, costUsd: p.costUsd })),
        variants,
        uniqueUsers: primary?.usage.uniqueUsers ?? null, sessions: primary?.usage.sessions ?? null, costUsd: primary?.usage.costUsd ?? null,
        cachedInputPercent: primary?.usage.cachedInputPercent ?? null, weeklyRetentionPercent: primary?.usage.weeklyRetentionPercent ?? null,
        rankWeek: rankByKey.get(key) ?? null, detailAvailable: dets.length > 0,
      },
      openrouter: hasOr ? {
        tokens: orTokens, share: orShare, changeWeek: orChange,
        variants: orList.flatMap((b) => b.variants.map((v) => ({
          variant: (v.variant === 'free' || v.variant === 'batch' ? v.variant : 'standard') as 'standard' | 'free' | 'batch', permaslug: v.permaslug,
          tokens: { day: null, week: v.tokensWeek, month: null },
          changeWeek: v.change, requests: { day: null, week: v.requestsWeek, month: null },
          promptTokens: { day: null, week: null, month: null }, completionTokens: { day: null, week: null, month: null }, byokTokens: { day: null, week: null, month: null },
        }))),
        requests: { day: orList.reduce((s, b) => s + b.requests.day, 0), week: orList.reduce((s, b) => s + b.requests.week, 0), month: orList.reduce((s, b) => s + b.requests.month, 0) },
        promptTokens: { day: orList.reduce((s, b) => s + b.prompt.day, 0), week: orList.reduce((s, b) => s + b.prompt.week, 0), month: orList.reduce((s, b) => s + b.prompt.month, 0) },
        completionTokens: { day: orList.reduce((s, b) => s + b.completion.day, 0), week: orList.reduce((s, b) => s + b.completion.week, 0), month: orList.reduce((s, b) => s + b.completion.month, 0) },
        byokTokens: { day: orList.reduce((s, b) => s + b.byok.day, 0), week: orList.reduce((s, b) => s + b.byok.week, 0), month: orList.reduce((s, b) => s + b.byok.month, 0) },
        matchType: 'exact',
      } : null,
      combined: EMPTY_COMBINED,
      status: hasOr ? 'matched' : 'opencode-only',
      stale,
    });
  }
  // combined observed usage per model + global sort
  const combinedTotals = { day: ocDay + orDayTotal, week: ocWeek + orWeekTotal, month: ocMonth + orMonthTotal };
  const ocTotals = { day: ocDay, week: ocWeek, month: ocMonth };
  const orTotals = { day: orDayTotal, week: orWeekTotal, month: orMonthTotal };
  for (const m of models) {
    m.combined = combinedUsage(
      m.opencode ? { tokens: m.opencode.tokens, changeWeek: m.opencode.changeWeek, changeIsNew: m.opencode.changeIsNew } : null,
      m.openrouter ? { tokens: m.openrouter.tokens, changeWeek: m.openrouter.changeWeek } : null,
      { opencode: ocTotals, openrouter: orTotals },
    );
  }
  // sort models: combined week desc, then combined day desc
  models.sort((a, b) => ((b.combined.tokens.week ?? -1) - (a.combined.tokens.week ?? -1)) || ((b.combined.tokens.day ?? -1) - (a.combined.tokens.day ?? -1)));

  // labs table
  const labIdsAll = [...new Set(models.map((m) => m.lab))].sort();
  const ocWeekByLab = new Map<string, number>();
  for (const [labId, d] of Object.entries(labs)) {
    const s = (d.daily || []).filter((x) => weekDates.has(x.date)).reduce((a, x) => a + x.tokens, 0);
    ocWeekByLab.set(labId, s);
  }
  const orWeekByLab = new Map<string, number>();
  for (const m of models) {
    if (!m.openrouter) continue;
    orWeekByLab.set(m.lab, (orWeekByLab.get(m.lab) || 0) + (m.openrouter.tokens.week || 0));
  }
  // labs table: display names come from the model rows so the filter dropdown
  // matches what the table shows (raw ids like 'typesafe' never leak here)
  const labDisplay = new Map<string, string>();
  for (const m of models) if (!labDisplay.has(m.lab)) labDisplay.set(m.lab, m.labName);
  const labsOut = labIdsAll.map((id) => ({
    id, name: labDisplay.get(id) || labNameOf(id),
    opencodeTokensWeek: ocWeekByLab.get(id) || 0,
    openrouterTokensWeek: orWeekByLab.get(id) || 0,
    combinedTokensWeek: (ocWeekByLab.get(id) || 0) + (orWeekByLab.get(id) || 0),
    models: models.filter((m) => m.lab === id).length,
  })).sort((a, b) => b.combinedTokensWeek - a.combinedTokensWeek);

  const matched = models.filter((m) => m.status === 'matched');
  const ocOnly = models.filter((m) => m.status === 'opencode-only' && (m.opencode?.tokens.week || 0) > 0);
  const orOnly = models.filter((m) => m.status === 'openrouter-only');
  const orMatchedTokensWeek = matched.reduce((s, m) => s + (m.openrouter?.tokens.week || 0), 0);
  const ocMatchedTokensWeek = matched.reduce((s, m) => s + (m.opencode?.tokens.week || 0), 0);
  const unmatchedTop = orOnly.slice().sort((a, b) => (b.openrouter?.tokens.week || 0) - (a.openrouter?.tokens.week || 0)).slice(0, 10).map((m) => ({ name: `${m.labName}/${m.name}`, tokensWeek: m.openrouter?.tokens.week || 0, reason: 'OpenRouter-only' }));

  // validation
  const errors: string[] = [];
  if (Object.keys(labs).length < 60) errors.push(`labs ${Object.keys(labs).length} < 60`);
  if (groups.size < 400) errors.push(`groups ${groups.size} < 400`);
  if (orBases.size < 400) errors.push(`OR bases ${orBases.size} < 400`);
  const coverage = orWeekTotal ? (orMatchedTokensWeek / orWeekTotal) * 100 : 0;
  if (coverage < 50) errors.push(`OR coverage ${coverage.toFixed(1)}% < 50%`);
  else if (coverage < 80) warnings.push(`OR coverage low: ${coverage.toFixed(1)}%`);
  const endAge = Date.now() - new Date(windowEnd + 'T00:00:00Z').getTime();
  if (endAge > 4 * 86400000) errors.push(`window end ${windowEnd} too old`);

  const data: DataFile = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    window: { end: windowEnd, day, weekStart, monthStart, timezone: 'UTC', opencodeUpdatedAt: index.updatedAt, openrouterAsOf: latestWeek },
    sources: {
      opencode: { name: 'OpenCode Data', url: 'https://opencode.ai/data/', fetchedAt: new Date().toISOString(), asOf: index.updatedAt, license: null },
      openrouter: { name: 'OpenRouter rankings', url: 'https://openrouter.ai/rankings', fetchedAt: new Date().toISOString(), asOf: latestWeek, license: 'CC BY 4.0' },
    },
    totals: {
      opencode: { day: ocDay, week: ocWeek, month: ocMonth },
      openrouter: { day: orDayTotal, week: orWeekTotal, month: orMonthTotal },
      combined: combinedTotals,
      opencodeModelsWithUsage: { day: models.filter((m) => (m.opencode?.tokens.day || 0) > 0).length, week: models.filter((m) => (m.opencode?.tokens.week || 0) > 0).length, month: models.filter((m) => (m.opencode?.tokens.month || 0) > 0).length },
      openrouterModelsWithUsage: { day: orBases.size ? [...orBases.values()].filter((b) => b.tokens.day > 0).length : 0, week: [...orBases.values()].filter((b) => b.tokens.week > 0).length, month: [...orBases.values()].filter((b) => b.tokens.month > 0).length },
      matchedModels: matched.length,
    },
    match: {
      opencodeModels: groups.size,
      opencodeUsageGroups: [...twoMonthByGroup.values()].filter((v) => v > 0).length,
      openrouterModels: orBases.size,
      matchedGroups: matched.length,
      opencodeOnlyGroups: ocOnly.length,
      openrouterOnlyModels: orOnly.length,
      openrouterTokenCoverage: { day: orDayTotal ? (matched.reduce((s, m) => s + (m.openrouter?.tokens.day || 0), 0) / orDayTotal) * 100 : null, week: orWeekTotal ? (orMatchedTokensWeek / orWeekTotal) * 100 : null, month: orMonthTotal ? (matched.reduce((s, m) => s + (m.openrouter?.tokens.month || 0), 0) / orMonthTotal) * 100 : null },
      opencodeTokenCoverage: { day: ocDay ? (matched.reduce((s, m) => s + (m.opencode?.tokens.day || 0), 0) / ocDay) * 100 : null, week: ocWeek ? (ocMatchedTokensWeek / ocWeek) * 100 : null, month: ocMonth ? (matched.reduce((s, m) => s + (m.opencode?.tokens.month || 0), 0) / ocMonth) * 100 : null },
      unmatchedTop,
      warnings,
    },
    labs: labsOut,
    models,
  };

  await fs.mkdir(path.dirname(OUT), { recursive: true });
  const tmp = OUT + '.tmp';
  await fs.writeFile(tmp, JSON.stringify(data));
  await fs.rename(tmp, OUT);
  await fs.mkdir(path.dirname(REPORT), { recursive: true });
  const topCombined = models.filter((m) => (m.combined.tokens.week || 0) > 0).slice(0, 8).map((m) => `- ${m.name} (${(m.combined.tokens.week! / 1e12).toFixed(1)}T, ${m.combined.share.week?.toFixed(1)}%)`);
  await fs.writeFile(REPORT, `# Match report\n\n- Generated: ${data.generatedAt}\n- Window end: ${windowEnd}\n- Models: ${models.length} (matched ${matched.length}, OC-only ${ocOnly.length}, OR-only ${orOnly.length})\n- OR week coverage: ${coverage.toFixed(1)}%\n- Combined week: ${(combinedTotals.week / 1e12).toFixed(1)}T (OC ${((ocWeek / combinedTotals.week) * 100).toFixed(1)}% · OR ${((orWeekTotal / combinedTotals.week) * 100).toFixed(1)}%)\n- Errors: ${errors.length ? errors.join('; ') : 'none'}\n- Warnings: ${warnings.length}\n${warnings.map((w) => `  - ${w}`).join('\n')}\n\n## Top combined (week)\n${topCombined.join('\n')}\n`);
  console.log(`wrote ${OUT} (${models.length} models) in ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  console.log(`coverage OR week ${coverage.toFixed(1)}%`);
  if (errors.length) {
    console.error('VALIDATION FAILED: ' + errors.join('; '));
    process.exit(1);
  }
}

main().catch((e) => { console.error(e); process.exit(1); });
