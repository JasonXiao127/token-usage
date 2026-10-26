import { fetchJson, fetchText, mapPool } from './fetch.ts';

export interface OcIndex {
  page: string;
  updatedAt: string;
  summary: string;
  leaderboard: { pastWeek: Array<{ rank: number; model: string; name: string; lab: string; page: string; tokens: number; changePercent: number | null }>; pastDay: unknown[] };
  dailyTokens: Array<{ date: string; total: number; models: Record<string, number> }>;
  dailyUniqueUsers: Array<{ date: string; total: number; models: Record<string, number> }>;
  [k: string]: unknown;
}

export interface OcLabModel {
  id: string;
  name: string;
  page: string;
  tokens: number;
  sharePercent: number;
  contextTokens: number;
  outputTokens: number;
  releaseDate: string | null;
}

export interface OcLab {
  page: string;
  updatedAt: string;
  summary: string;
  lab: { id: string; name: string; description: string | null };
  usage: { tokens: number; sessions: number; sharePercent: number; changePercent: number; modelsWithUsage: number } | null;
  models: OcLabModel[];
  daily: Array<{ date: string; tokens: number; uniqueUsers: number; sessions: number; costUsd: number }>;
}

export interface OcUsageRow {
  lab: string; // page lab segment
  model: string; // usage model key
  provider: string;
  author: string;
  tokens: number;
  share: number;
  slug: string;
}

export interface OcDetail {
  page: string;
  updatedAt: string;
  summary: string;
  model: {
    id: string;
    name: string;
    lab: string;
    labName: string;
    family: string;
    description: string | null;
    releaseDate: string | null;
    lastUpdated: string | null;
    knowledgeCutoff: string | null;
    contextTokens: number;
    outputTokens: number;
    inputModalities: string[];
    outputModalities: string[];
    reasoning: boolean;
    toolCall: boolean;
    openWeights: boolean;
    weights: Array<{ label: string; url: string }>;
    priceUsdPer1M: { input: number | null; output: number | null; cachedInput: number | null; cacheWrite: number | null } | null;
    benchmarks: Array<{ name: string; score: number; metric: string }>;
  };
  usage: {
    rankLastWeek: number;
    tokens: number;
    sharePercent: number;
    changePercent: number;
    uniqueUsers: number;
    sessions: number;
    tokensPerSession: number;
    costPerSessionUsd: number;
    costUsd: number;
    cachedInputPercent: number;
    weeklyRetentionPercent: number;
    daily: Array<{ date: string; tokens: number; uniqueUsers: number; sessions: number; costUsd: number }>;
    countries: Array<{ rank: number; country: string; tokens: number; sharePercent: number }>;
    peers: Array<{ rank: number; model: string; lab: string; page: string; tokens: number }>;
  };
}

const OC = 'https://opencode.ai';

export async function fetchIndex(): Promise<OcIndex> {
  return fetchJson<OcIndex>(`${OC}/data/index.json`);
}

export async function fetchLabList(): Promise<string[]> {
  const xml = await fetchText(`${OC}/data/sitemap.xml`);
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]!);
  const labs = new Set<string>();
  for (const u of urls) {
    const p = u.replace('https://opencode.ai/data/', '').replace(/\/$/, '');
    if (!p || p === 'compare') continue;
    const seg = p.split('/');
    if (seg.length === 1 && seg[0]) labs.add(seg[0]!);
  }
  return [...labs].sort();
}

export async function fetchLabs(labIds: string[]): Promise<{ labs: Record<string, OcLab>; failures: Array<{ lab: string; err: string }> }> {
  const labs: Record<string, OcLab> = {};
  const failures: Array<{ lab: string; err: string }> = [];
  await mapPool(labIds, 6, async (lab) => {
    try {
      labs[lab] = await fetchJson<OcLab>(`${OC}/data/${lab}.json`);
    } catch (e) {
      failures.push({ lab, err: e instanceof Error ? e.message : String(e) });
    }
  });
  return { labs, failures };
}

/** Parse the authoritative per-model usage array embedded in a lab HTML page. */
export function parseLabUsageHtml(html: string): { rows: OcUsageRow[]; modelPaths: Record<string, string> } {
  const marker = '],models:$R[';
  const start = html.indexOf(marker);
  const mpIdx = html.indexOf('modelPaths:', start >= 0 ? start : 0);
  if (start < 0 || mpIdx < 0) throw new Error('lab usage payload not found');
  const seg = html.slice(start + 2, mpIdx);
  const rows: OcUsageRow[] = [];
  const re = /\{model:"([^"]*)",provider:"([^"]*)",author:"([^"]*)",tokens:([0-9.eE+-]+),share:([0-9.eE+-]+),slug:"([^"]*)"\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(seg))) {
    rows.push({ model: m[1]!, provider: m[2]!, author: m[3]!, tokens: Number(m[4]), share: Number(m[5]), slug: m[6]!, lab: '' });
  }
  // modelPaths map: {"google/gemini-4-argon":"/data/google/gemini-4-argon",...}
  const modelPaths: Record<string, string> = {};
  const mpStart = html.indexOf('modelPaths:$R[');
  const mpSeg = html.slice(mpStart, mpStart + 200000);
  const brace = mpSeg.indexOf('{');
  if (brace >= 0) {
    let depth = 0; let end = -1;
    for (let i = brace; i < mpSeg.length; i++) {
      const c = mpSeg[i];
      if (c === '{') depth++;
      else if (c === '}') { depth--; if (depth === 0) { end = i; break; } }
    }
    if (end > 0) {
      const obj = mpSeg.slice(brace, end + 1);
      const kre = /"([^"]+)":"([^"]+)"/g;
      let km: RegExpExecArray | null;
      while ((km = kre.exec(obj))) modelPaths[km[1]!] = km[2]!;
    }
  }
  return { rows, modelPaths };
}

export async function fetchLabUsageHtml(labIds: string[]): Promise<{ usage: Record<string, { rows: OcUsageRow[]; modelPaths: Record<string, string> }>; failures: Array<{ lab: string; err: string }> }> {
  const usage: Record<string, { rows: OcUsageRow[]; modelPaths: Record<string, string> }> = {};
  const failures: Array<{ lab: string; err: string }> = [];
  await mapPool(labIds, 6, async (lab) => {
    try {
      const html = await fetchText(`${OC}/data/${lab}`);
      const parsed = parseLabUsageHtml(html);
      for (const r of parsed.rows) r.lab = lab;
      usage[lab] = parsed;
    } catch (e) {
      failures.push({ lab, err: e instanceof Error ? e.message : String(e) });
    }
  });
  return { usage, failures };
}

export async function fetchDetails(slugs: string[]): Promise<{ details: Record<string, OcDetail>; failures: Array<{ slug: string; err: string }> }> {
  const details: Record<string, OcDetail> = {};
  const failures: Array<{ slug: string; err: string }> = [];
  await mapPool(slugs, 6, async (slug) => {
    let lastErr = '';
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        details[slug] = await fetchJson<OcDetail>(`${OC}/data/${slug}.json`, { tries: 1 });
        return;
      } catch (e) {
        lastErr = e instanceof Error ? e.message : String(e);
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
    failures.push({ slug, err: lastErr });
  });
  return { details, failures };
}
