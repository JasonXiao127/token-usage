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
  const cls = c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)';
  return <span className={`num text-[11px] ${cls}`}>{c.text}</span>;
}

export function StatusText({ status }: { status: ModelRow['status'] }) {
  const label = status === 'matched' ? 'both' : status === 'opencode-only' ? 'OC only' : 'OR only';
  return <span className="whitespace-nowrap text-[11px] text-(--muted)">{label}</span>;
}

const COLS: Array<{ key: SortKey | string; label: string }> = [
  { key: 'name', label: 'Model' },
  { key: 'oc', label: 'OpenCode' },
  { key: 'or', label: 'OpenRouter' },
  { key: 'idx', label: 'Index' },
  { key: 'ctx', label: 'Context' },
  { key: 'price', label: 'Price $/1M' },
  { key: 'rel', label: 'Released' },
];

function IndexTick({ m, metric }: { m: ModelRow; metric: Metric }) {
  const idx = indexRatio(m, metric);
  if (idx == null) return <span className="text-[11px] text-(--muted)">{indexLabel(m, metric)}</span>;
  const w = Math.min(64, Math.abs(idx) * 22 + 8);
  return (
    <span className="flex items-center gap-2">
      <span className="relative block h-[3px] w-16 bg-(--rule)">
        <span
          className="absolute top-0 h-[3px]"
          style={{
            width: `${w / 2}px`,
            background: idx >= 0 ? 'var(--oc)' : 'var(--or)',
            ...(idx >= 0 ? { left: '50%' } : { right: '50%' }),
          }}
        />
        <span className="absolute left-1/2 top-[-2px] h-[7px] w-px bg-(--muted)" />
      </span>
      <span className="num whitespace-nowrap text-[11px]">{indexLabel(m, metric)}</span>
    </span>
  );
}

export default function ModelTable({ metric, rows, sort, dir, onSort, onSelect, page, perPage, onPage }: {
  data: DataFile; metric: Metric; rows: ModelRow[]; sort: string; dir: 'asc' | 'desc';
  onSort: (k: string) => void; onSelect: (k: string) => void; page: number; perPage: number; onPage: (p: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const pageRows = rows.slice((page - 1) * perPage, page * perPage);
  return (
    <div>
      <div className="tu-scroll hidden overflow-x-auto md:block">
        <table className="w-full min-w-[860px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-(--ink)">
              {COLS.map((c) => (
                <th key={c.key} aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined} className="px-3 py-2 pl-0 pr-6 text-[11px] font-medium text-(--muted)">
                  <button onClick={() => onSort(c.key)} className="hover:text-(--ink)">
                    {c.label}{sort === c.key ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m) => {
              const oc = tokensOf(m, 'opencode', metric);
              const or = tokensOf(m, 'openrouter', metric);
              return (
                <tr key={m.key} onClick={() => onSelect(m.key)} onKeyDown={(e) => e.key === 'Enter' && onSelect(m.key)} tabIndex={0} className="cursor-pointer border-b border-(--rule) hover:bg-(--paper-deep)">
                  <td className="max-w-[260px] py-2 pl-0 pr-4">
                    <span className="flex items-baseline gap-2">
                      <span className="mt-1 h-[7px] w-[7px] shrink-0 self-center" style={{ background: labColor(m.lab) }} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{m.name}</span>
                        <span className="block truncate text-[11px] text-(--muted)">{m.labName} · {modalityOf(m)}{m.stale ? ' · stale' : ''}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2 pl-0 pr-6">
                    {oc == null ? <span className="text-(--muted)" title="No OpenCode data">—</span> : (
                      <span><span className="num font-medium">{fmtTokens(oc)}</span> <span className="num text-[11px] text-(--muted)">{fmtShare(shareOf(m, 'opencode', metric))}</span><br /><Change v={m.opencode?.changeWeek ?? null} isNew={m.opencode?.changeIsNew} /></span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2 pl-0 pr-6">
                    {or == null ? <span className="text-(--muted)" title="No OpenRouter match">—</span> : (
                      <span><span className="num font-medium">{fmtTokens(or)}</span> <span className="num text-[11px] text-(--muted)">{fmtShare(shareOf(m, 'openrouter', metric))}</span><br /><Change v={m.openrouter?.changeWeek ?? null} /></span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2 pl-0 pr-6"><IndexTick m={m} metric={metric} /></td>
                  <td className="num whitespace-nowrap py-2 pl-0 pr-6">{fmtCtx(m.meta.contextTokens)}</td>
                  <td className="num whitespace-nowrap py-2 pl-0 pr-6 text-[12px]">{fmtPrice(m.meta.pricing?.input ?? m.meta.orPricing?.input)} / {fmtPrice(m.meta.pricing?.output ?? m.meta.orPricing?.output)}</td>
                  <td className="num whitespace-nowrap py-2 pl-0 pr-0 text-[12px] text-(--muted)">{m.meta.releaseDate || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="md:hidden">
        {pageRows.map((m) => (
          <button key={m.key} onClick={() => onSelect(m.key)} className="block w-full border-b border-(--rule) py-3 text-left">
            <span className="flex items-baseline gap-2">
              <span className="h-[7px] w-[7px] shrink-0" style={{ background: labColor(m.lab) }} aria-hidden="true" />
              <span className="flex-1 truncate text-[13px] font-medium">{m.name}</span>
              <StatusText status={m.status} />
            </span>
            <span className="num mt-1 grid grid-cols-2 gap-2 text-[12px]">
              <span>OC <b>{fmtTokens(tokensOf(m, 'opencode', metric))}</b> <span className="text-(--muted)">{fmtShare(shareOf(m, 'opencode', metric))}</span></span>
              <span>OR <b>{fmtTokens(tokensOf(m, 'openrouter', metric))}</b> <span className="text-(--muted)">{fmtShare(shareOf(m, 'openrouter', metric))}</span></span>
            </span>
          </button>
        ))}
      </div>
      <div className="flex items-center justify-between py-2.5 text-[12px] text-(--muted)">
        <span className="num">{rows.length} models · p. {page} of {totalPages}</span>
        <span className="flex gap-4">
          <button disabled={page <= 1} onClick={() => onPage(page - 1)} className="underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40">Prev</button>
          <button disabled={page >= totalPages} onClick={() => onPage(page + 1)} className="underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40">Next</button>
        </span>
      </div>
    </div>
  );
}
