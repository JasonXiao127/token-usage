import type { DataFile, Metric, ModelRow } from '../../shared/types';
import { tokensOf, shareOf, indexRatio, indexLabel, modalityOf } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange, fmtCtx, fmtPrice } from '../lib/format';
import { labColor } from '../lib/colors';

export type SortKey = 'oc' | 'or' | 'idx' | 'name' | 'ctx' | 'price' | 'rel';

export function sortModels(models: ModelRow[], sort: SortKey | string, dir: 'asc' | 'desc', metric: Metric): ModelRow[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...models].sort((a, b) => {
    switch (sort) {
      case 'or': return ((tokensOf(a, 'openrouter', metric) ?? -1) - (tokensOf(b, 'openrouter', metric) ?? -1)) * m;
      case 'idx': return (((indexRatio(a, metric) ?? -999)) - ((indexRatio(b, metric) ?? -999))) * m;
      case 'name': return a.name.localeCompare(b.name) * m;
      case 'ctx': return (((a.meta.contextTokens ?? -1)) - ((b.meta.contextTokens ?? -1))) * m;
      case 'price': return (((a.meta.pricing?.input ?? a.meta.orPricing?.input ?? -1)) - ((b.meta.pricing?.input ?? b.meta.orPricing?.input ?? -1))) * m;
      case 'rel': return ((a.meta.releaseDate || '').localeCompare(b.meta.releaseDate || '')) * m;
      case 'oc':
      default: return ((tokensOf(a, 'opencode', metric) ?? -1) - (tokensOf(b, 'opencode', metric) ?? -1)) * m;
    }
  });
}

function Change({ v, isNew }: { v: number | null; isNew?: boolean }) {
  const c = fmtChange(v, isNew);
  const cls = c.tone === 'up' ? 'text-emerald-600 dark:text-emerald-400' : c.tone === 'down' ? 'text-rose-500' : 'text-neutral-400';
  return <span className={`num text-[11px] ${cls}`}>{c.text}</span>;
}

export function StatusBadge({ status }: { status: ModelRow['status'] }) {
  const map = {
    matched: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    'opencode-only': 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300',
    'openrouter-only': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  } as const;
  const label = status === 'matched' ? 'both' : status === 'opencode-only' ? 'OC only' : 'OR only';
  return <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${map[status]}`}>{label}</span>;
}

const COLS: Array<{ key: SortKey | string; label: string; sortable: boolean; hideable?: boolean }> = [
  { key: 'name', label: 'Model', sortable: true },
  { key: 'oc', label: 'OpenCode', sortable: true },
  { key: 'or', label: 'OpenRouter', sortable: true },
  { key: 'idx', label: 'Index', sortable: true },
  { key: 'ctx', label: 'Context', sortable: true },
  { key: 'price', label: 'Price $/1M', sortable: true },
  { key: 'rel', label: 'Released', sortable: true },
];

export default function ModelTable({ data, metric, rows, sort, dir, onSort, onSelect, page, perPage, onPage }: {
  data: DataFile; metric: Metric; rows: ModelRow[]; sort: string; dir: 'asc' | 'desc';
  onSort: (k: string) => void; onSelect: (k: string) => void; page: number; perPage: number; onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const pageRows = rows.slice((page - 1) * perPage, page * perPage);
  return (
    <div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-900">
      <div className="tu-scroll hidden overflow-x-auto md:block">
        <table className="w-full min-w-[880px] text-left text-[13px]">
          <thead>
            <tr className="border-b border-neutral-200 dark:border-neutral-800">
              {COLS.map((c) => (
                <th key={c.key} aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-3 py-2.5 text-xs font-medium text-neutral-500 dark:text-neutral-400">
                  <button onClick={() => onSort(c.key)} className="hover:text-neutral-900 dark:hover:text-neutral-100">
                    {c.label}{sort === c.key ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {pageRows.map((m) => {
              const oc = tokensOf(m, 'opencode', metric);
              const or = tokensOf(m, 'openrouter', metric);
              const idx = indexRatio(m, metric);
              return (
                <tr key={m.key} onClick={() => onSelect(m.key)} onKeyDown={(e) => e.key === 'Enter' && onSelect(m.key)} tabIndex={0} className="cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                  <td className="max-w-[260px] px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: labColor(m.lab) }} />
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-neutral-900 dark:text-neutral-100">{m.name}</span>
                        <span className="block truncate text-[11px] text-neutral-500">{m.labName} · {modalityOf(m)} {m.stale ? '· stale' : ''}</span>
                      </span>
                      <StatusBadge status={m.status} />
                    </div>
                  </td>
                  <td className="px-3 py-2">
                    {oc == null ? <span className="text-neutral-400" title="No OpenCode data">—</span> : (
                      <span><span className="num font-medium">{fmtTokens(oc)}</span> <span className="num text-[11px] text-neutral-500">{fmtShare(shareOf(m, 'opencode', metric))}</span><br /><Change v={m.opencode?.changeWeek ?? null} isNew={m.opencode?.changeIsNew} /></span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {or == null ? <span className="text-neutral-400" title="No OpenRouter match">—</span> : (
                      <span><span className="num font-medium">{fmtTokens(or)}</span> <span className="num text-[11px] text-neutral-500">{fmtShare(shareOf(m, 'openrouter', metric))}</span><br /><Change v={m.openrouter?.changeWeek ?? null} /></span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {idx == null ? <span className="text-[11px] text-neutral-400">{indexLabel(m, metric)}</span> : (
                      <span className="flex items-center gap-1.5">
                        <span className="flex h-1.5 w-16 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                          <span className={`h-full ${idx >= 0 ? 'ml-auto bg-teal-500' : 'mr-auto bg-violet-500'}`} style={{ width: `${Math.min(100, Math.abs(idx) * 25)}%` }} />
                        </span>
                        <span className="num text-[11px]">{indexLabel(m, metric)}</span>
                      </span>
                    )}
                  </td>
                  <td className="num px-3 py-2">{fmtCtx(m.meta.contextTokens)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-[12px]">{fmtPrice(m.meta.pricing?.input ?? m.meta.orPricing?.input)} / {fmtPrice(m.meta.pricing?.output ?? m.meta.orPricing?.output)}</td>
                  <td className="num whitespace-nowrap px-3 py-2 text-[12px] text-neutral-500">{m.meta.releaseDate || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {/* mobile cards */}
      <div className="divide-y divide-neutral-100 md:hidden dark:divide-neutral-800">
        {pageRows.map((m) => (
          <button key={m.key} onClick={() => onSelect(m.key)} className="block w-full px-4 py-3 text-left">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: labColor(m.lab) }} />
              <span className="flex-1 truncate text-sm font-medium">{m.name}</span>
              <StatusBadge status={m.status} />
            </div>
            <div className="num mt-1 grid grid-cols-2 gap-2 text-xs">
              <span>OC <b>{fmtTokens(tokensOf(m, 'opencode', metric))}</b> <span className="text-neutral-500">{fmtShare(shareOf(m, 'opencode', metric))}</span></span>
              <span>OR <b>{fmtTokens(tokensOf(m, 'openrouter', metric))}</b> <span className="text-neutral-500">{fmtShare(shareOf(m, 'openrouter', metric))}</span></span>
            </div>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between border-t border-neutral-200 px-4 py-2.5 text-xs text-neutral-500 dark:border-neutral-800">
        <span>{rows.length} models · page {page} of {totalPages}</span>
        <span className="flex gap-1">
          <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="rounded-lg border border-neutral-200 px-2.5 py-1 disabled:opacity-40 dark:border-neutral-700">Prev</button>
          <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="rounded-lg border border-neutral-200 px-2.5 py-1 disabled:opacity-40 dark:border-neutral-700">Next</button>
        </span>
      </div>
    </div>
  );
}
