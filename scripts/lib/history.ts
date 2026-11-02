import fs from 'node:fs/promises';
import path from 'node:path';
import type { ModelRow } from '../../shared/types.ts';
import type { HistoryDayFile, HistoryDayModel, HistoryIndex } from '../../shared/history.ts';

export const HISTORY_ROOT = 'public/data/history';
export const HISTORY_INDEX_PATH = `${HISTORY_ROOT}/index.json`;

const OC_SOURCE = { name: 'OpenCode Data', url: 'https://opencode.ai/data/' };
const OR_SOURCE = { name: 'OpenRouter rankings', url: 'https://openrouter.ai/rankings' };

export function historyFilePath(date: string, kind: 'combined' | 'oc' | 'or'): string {
  const [y, m] = date.split('-');
  const suffix = kind === 'combined' ? '' : `.${kind}`;
  return `${HISTORY_ROOT}/${y}/${m}/${date}${suffix}.json`;
}

export function historyFileKind(file: string): 'combined' | 'oc' | 'or' {
  if (file.endsWith('.oc.json')) return 'oc';
  if (file.endsWith('.or.json')) return 'or';
  return 'combined';
}

function addOpt(a: number | null | undefined, b: number | null | undefined): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

function priceOf(m: ModelRow): { priceIn: number | null; priceOut: number | null; priceCached: number | null } {
  return {
    priceIn: m.meta.pricing?.input ?? m.meta.orPricing?.input ?? null,
    priceOut: m.meta.pricing?.output ?? m.meta.orPricing?.output ?? null,
    priceCached: m.meta.pricing?.cachedInput ?? m.meta.orPricing?.cachedInput ?? null,
  };
}

function ocSideFor(m: ModelRow, ocDate: string): HistoryDayModel['oc'] {
  if (!m.opencode) return null;
  const tokens = m.opencode.tokens.day;
  if (tokens == null || tokens <= 0) return null;
  const day = m.opencode.daily.find((d) => d.date === ocDate);
  return {
    tokens,
    users: day?.users ?? null,
    sessions: day?.sessions ?? null,
    costUsd: day?.costUsd ?? null,
    ids: (m.opencode.variants || []).map((v) => v.id),
  };
}

function orSideFor(m: ModelRow): HistoryDayModel['or'] {
  if (!m.openrouter) return null;
  const tokens = m.openrouter.tokens.day;
  if (tokens == null || tokens <= 0) return null;
  return {
    tokens,
    requests: m.openrouter.requests.day,
    prompt: m.openrouter.promptTokens.day,
    completion: m.openrouter.completionTokens.day,
    byok: m.openrouter.byokTokens.day,
    permas: (m.openrouter.variants || []).map((v) => v.permaslug),
  };
}

function toHistoryModel(m: ModelRow, ocDate: string, includeOc: boolean, includeOr: boolean): HistoryDayModel | null {
  const oc = includeOc ? ocSideFor(m, ocDate) : null;
  const or = includeOr ? orSideFor(m) : null;
  if (!oc && !or) return null;
  const price = priceOf(m);
  return {
    key: m.key,
    name: m.name,
    lab: m.lab,
    labName: m.labName,
    status: m.status,
    oc,
    or,
    combined: addOpt(oc?.tokens, or?.tokens),
    priceIn: price.priceIn,
    priceOut: price.priceOut,
    priceCached: price.priceCached,
  };
}

export interface RunHistoryInput {
  ocDate: string;
  orDate: string;
  generatedAt: string;
  opencodeAsOf: string;
  openrouterAsOf: string;
  ocDayTotal: number;
  orDayTotal: number;
  models: ModelRow[];
  match: {
    matched: number;
    opencodeOnly: number;
    openrouterOnly: number;
    opencodeCoverage: number | null;
    openrouterCoverage: number | null;
  };
}

function sourcesFor(input: RunHistoryInput) {
  return {
    opencode: {
      ...OC_SOURCE,
      asOf: input.opencodeAsOf,
      citation: `OpenCode Data (opencode.ai/data), as of ${input.opencodeAsOf}`,
    },
    openrouter: {
      ...OR_SOURCE,
      asOf: input.openrouterAsOf,
      license: 'CC BY 4.0',
    },
  };
}

/** Build the history file(s) for one collector run. One combined file when both
 * sources cover the same UTC day, else one source-only file per source date. */
export function buildHistoryForRun(input: RunHistoryInput): Array<{ kind: 'combined' | 'oc' | 'or'; file: HistoryDayFile }> {
  const sources = sourcesFor(input);
  if (input.ocDate === input.orDate) {
    const models: HistoryDayModel[] = [];
    for (const m of input.models) {
      const h = toHistoryModel(m, input.ocDate, true, true);
      if (h) models.push(h);
    }
    models.sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));
    return [{
      kind: 'combined',
      file: {
        schemaVersion: 1,
        date: input.ocDate,
        ocDate: input.ocDate,
        orDate: input.orDate,
        archivedAt: input.generatedAt,
        partial: false,
        sources,
        totals: {
          opencode: input.ocDayTotal,
          openrouter: input.orDayTotal,
          combined: input.ocDayTotal + input.orDayTotal,
        },
        match: {
          matched: input.match.matched,
          opencodeOnly: input.match.opencodeOnly,
          openrouterOnly: input.match.openrouterOnly,
          opencodeCoverage: input.match.opencodeCoverage,
          openrouterCoverage: input.match.openrouterCoverage,
        },
        models,
      },
    }];
  }
  // Dates differ: write one source-only file per source date so no file
  // mislabels one source's day as the other's.
  const ocModels: HistoryDayModel[] = [];
  for (const m of input.models) {
    const h = toHistoryModel(m, input.ocDate, true, false);
    if (h) ocModels.push(h);
  }
  ocModels.sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));
  const orModels: HistoryDayModel[] = [];
  for (const m of input.models) {
    const h = toHistoryModel(m, input.orDate, false, true);
    if (h) orModels.push(h);
  }
  orModels.sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));
  return [
    {
      kind: 'oc',
      file: {
        schemaVersion: 1,
        date: input.ocDate,
        ocDate: input.ocDate,
        orDate: input.ocDate,
        archivedAt: input.generatedAt,
        partial: true,
        sources,
        totals: { opencode: input.ocDayTotal, openrouter: null, combined: input.ocDayTotal },
        match: {
          matched: 0,
          opencodeOnly: ocModels.length,
          openrouterOnly: 0,
          opencodeCoverage: input.match.opencodeCoverage,
          openrouterCoverage: null,
        },
        models: ocModels,
      },
    },
    {
      kind: 'or',
      file: {
        schemaVersion: 1,
        date: input.orDate,
        ocDate: input.orDate,
        orDate: input.orDate,
        archivedAt: input.generatedAt,
        partial: true,
        sources,
        totals: { opencode: null, openrouter: input.orDayTotal, combined: input.orDayTotal },
        match: {
          matched: 0,
          opencodeOnly: 0,
          openrouterOnly: orModels.length,
          opencodeCoverage: null,
          openrouterCoverage: input.match.openrouterCoverage,
        },
        models: orModels,
      },
    },
  ];
}

/** Backfill OC-only day files from detail daily arrays + index day totals.
 * Skips dates that already exist, dates after `maxDate` (the collector's
 * complete-day estimate), and today/future UTC days (partial data must
 * never be locked into an immutable file). Always marks partial
 * because only detail-backed models are included. */
export function buildOcBackfill(
  models: ModelRow[],
  indexDaily: Array<{ date: string; total: number }>,
  ctx: { generatedAt: string; opencodeAsOf: string; openrouterAsOf: string },
  skipDates: Set<string>,
  maxDate?: string,
): Array<{ kind: 'oc'; file: HistoryDayFile }> {
  const todayUtc = new Date().toISOString().slice(0, 10);
  const totalByDate = new Map(indexDaily.map((d) => [d.date, d.total]));
  const dates = [...new Set(models.flatMap((m) => (m.opencode?.daily || []).map((d) => d.date)))].sort();
  const out: Array<{ kind: 'oc'; file: HistoryDayFile }> = [];
  for (const date of dates) {
    if (date >= todayUtc) continue;
    if (maxDate && date > maxDate) continue;
    if (skipDates.has(date)) continue;
    if (skipDates.has(`${date}.oc`)) continue;
    const dayModels: HistoryDayModel[] = [];
    for (const m of models) {
      if (!m.opencode) continue;
      const pt = m.opencode.daily.find((d) => d.date === date);
      if (!pt || pt.tokens <= 0) continue;
      const price = priceOf(m);
      dayModels.push({
        key: m.key,
        name: m.name,
        lab: m.lab,
        labName: m.labName,
        status: m.status,
        oc: {
          tokens: pt.tokens,
          users: pt.users ?? null,
          sessions: pt.sessions ?? null,
          costUsd: pt.costUsd ?? null,
          ids: (m.opencode.variants || []).map((v) => v.id),
        },
        or: null,
        combined: pt.tokens,
        priceIn: price.priceIn,
        priceOut: price.priceOut,
        priceCached: price.priceCached,
      });
    }
    if (!dayModels.length) continue;
    dayModels.sort((a, b) => (b.combined ?? -1) - (a.combined ?? -1));
    const total = totalByDate.get(date) ?? dayModels.reduce((s, m) => s + (m.combined ?? 0), 0);
    out.push({
      kind: 'oc',
      file: {
        schemaVersion: 1,
        date,
        ocDate: date,
        orDate: date,
        archivedAt: ctx.generatedAt,
        partial: true,
        sources: {
          opencode: { ...OC_SOURCE, asOf: ctx.opencodeAsOf, citation: `OpenCode Data (opencode.ai/data), as of ${ctx.opencodeAsOf}` },
          openrouter: { ...OR_SOURCE, asOf: ctx.openrouterAsOf, license: 'CC BY 4.0' },
        },
        totals: { opencode: total, openrouter: null, combined: total },
        match: { matched: 0, opencodeOnly: dayModels.length, openrouterOnly: 0, opencodeCoverage: null, openrouterCoverage: null },
        models: dayModels,
      },
    });
  }
  return out;
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}

/** Write history files atomically; never overwrite an existing day file. */
export async function writeHistoryFiles(
  files: Array<{ kind: 'combined' | 'oc' | 'or'; file: HistoryDayFile }>,
): Promise<Array<{ path: string; written: boolean }>> {
  const results: Array<{ path: string; written: boolean }> = [];
  for (const { kind, file } of files) {
    const rel = historyFilePath(file.date, kind);
    if (await fileExists(rel)) {
      results.push({ path: rel, written: false });
      continue;
    }
    await fs.mkdir(path.dirname(rel), { recursive: true });
    const tmp = `${rel}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(file));
    await fs.rename(tmp, rel);
    results.push({ path: rel, written: true });
  }
  return results;
}

async function listHistoryFiles(): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries: Array<{ name: string; isDirectory(): boolean }> = [];
    try {
      entries = (await fs.readdir(dir, { withFileTypes: true })) as Array<{ name: string; isDirectory(): boolean }>;
    } catch {
      return;
    }
    for (const e of entries) {
      const full = `${dir}/${e.name}`;
      if (e.isDirectory()) await walk(full);
      else if (e.name.endsWith('.json') && !full.endsWith('/index.json')) out.push(full);
    }
  }
  await walk(HISTORY_ROOT);
  return out.sort();
}

/** Rebuild index.json from the day files on disk. */
export async function rebuildHistoryIndex(): Promise<{ entries: number }> {
  const files = await listHistoryFiles();
  const days = [];
  for (const f of files) {
    try {
      const raw = await fs.readFile(f, 'utf8');
      const d = JSON.parse(raw) as HistoryDayFile;
      if (d.schemaVersion !== 1 || !d.date || !Array.isArray(d.models)) continue;
      const rel = f.replace(`${HISTORY_ROOT}/`, '');
      const hasOc = d.totals.opencode != null;
      const hasOr = d.totals.openrouter != null;
      days.push({
        date: d.date,
        file: `data/history/${rel}`,
        sources: [...(hasOc ? ['opencode' as const] : []), ...(hasOr ? ['openrouter' as const] : [])],
        partial: d.partial,
        totals: d.totals,
        modelCount: d.models.length,
      });
    } catch {
      continue;
    }
  }
  days.sort((a, b) => a.date.localeCompare(b.date));
  const index: HistoryIndex = { schemaVersion: 1, updatedAt: new Date().toISOString(), days };
  await fs.mkdir(HISTORY_ROOT, { recursive: true });
  const tmp = `${HISTORY_INDEX_PATH}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(index));
  await fs.rename(tmp, HISTORY_INDEX_PATH);
  return { entries: days.length };
}

export async function historyDirBytes(): Promise<number> {
  let total = 0;
  for (const f of await listHistoryFiles()) {
    try {
      const st = await fs.stat(f);
      total += st.size;
    } catch {
      continue;
    }
  }
  try {
    total += (await fs.stat(HISTORY_INDEX_PATH)).size;
  } catch {
    /* index may not exist yet */
  }
  return total;
}

export interface HistoryIssue {
  level: 'error' | 'warning';
  message: string;
}

/** Validate history files + index. Size guard: warn >200MB, fail >500MB. */
export async function verifyHistory(): Promise<{ issues: HistoryIssue[]; files: number; bytes: number }> {
  const issues: HistoryIssue[] = [];
  const files = await listHistoryFiles();
  const seen = new Map<string, string>();
  const today = new Date().toISOString().slice(0, 10);
  for (const f of files) {
    let d: HistoryDayFile;
    try {
      d = JSON.parse(await fs.readFile(f, 'utf8')) as HistoryDayFile;
    } catch (e) {
      issues.push({ level: 'error', message: `${f}: unreadable (${e instanceof Error ? e.message : String(e)})` });
      continue;
    }
    if (d.schemaVersion !== 1) issues.push({ level: 'error', message: `${f}: schemaVersion != 1` });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date)) issues.push({ level: 'error', message: `${f}: bad date ${d.date}` });
    if (d.date > today) issues.push({ level: 'error', message: `${f}: date in the future` });
    const expected = historyFilePath(d.date, historyFileKind(f));
    if (expected !== f) issues.push({ level: 'error', message: `${f}: filename does not match date/kind (expected ${expected})` });
    const prev = seen.get(d.date + '#' + historyFileKind(f));
    if (prev) issues.push({ level: 'error', message: `${f}: duplicate of ${prev}` });
    else seen.set(d.date + '#' + historyFileKind(f), f);
    if (!Array.isArray(d.models) || d.models.length === 0) {
      issues.push({ level: 'error', message: `${f}: no models` });
      continue;
    }
    for (const m of d.models) {
      if (!m.key || !m.name || !m.lab) {
        issues.push({ level: 'error', message: `${f}: model missing key/name/lab` });
        break;
      }
      const oc = m.oc?.tokens ?? null;
      const or = m.or?.tokens ?? null;
      if (oc == null && or == null) {
        issues.push({ level: 'error', message: `${f}: ${m.key} has neither OC nor OR tokens` });
        break;
      }
      if ((oc != null && oc < 0) || (or != null && or < 0)) {
        issues.push({ level: 'error', message: `${f}: ${m.key} negative tokens` });
        break;
      }
      const expectCombined = addOpt(oc, or);
      if (m.combined !== expectCombined) {
        issues.push({ level: 'error', message: `${f}: ${m.key} combined ${m.combined} != oc+or ${expectCombined}` });
        break;
      }
    }
  }
  // index consistency
  try {
    const index = JSON.parse(await fs.readFile(HISTORY_INDEX_PATH, 'utf8')) as HistoryIndex;
    const indexed = new Set(index.days.map((e) => `${HISTORY_ROOT}/${e.file.replace(/^data\/history\//, '')}`));
    for (const f of files) {
      if (!indexed.has(f)) issues.push({ level: 'error', message: `${f}: missing from index.json (run rebuild)` });
    }
    for (const e of index.days) {
      const full = `${HISTORY_ROOT}/${e.file.replace(/^data\/history\//, '')}`;
      if (!files.includes(full)) issues.push({ level: 'error', message: `index entry ${e.date} points at missing ${e.file}` });
    }
    const sorted = [...index.days].sort((a, b) => a.date.localeCompare(b.date));
    if (JSON.stringify(sorted) !== JSON.stringify(index.days)) {
      issues.push({ level: 'error', message: `index.json days not sorted by date` });
    }
  } catch {
    if (files.length > 0) issues.push({ level: 'error', message: `index.json missing but ${files.length} day files exist` });
  }
  const bytes = await historyDirBytes();
  if (bytes > 500 * 1048576) issues.push({ level: 'error', message: `history ${(bytes / 1048576).toFixed(1)}MB exceeds 500MB budget` });
  else if (bytes > 200 * 1048576) issues.push({ level: 'warning', message: `history ${(bytes / 1048576).toFixed(1)}MB exceeds 200MB warning threshold` });
  return { issues, files: files.length, bytes };
}
