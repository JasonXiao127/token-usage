import type { DataFile, Metric, ModelRow } from '../../shared/types';
import { tokensOf, shareOf, combinedTokens, combinedShare, sourceMix, modalityOf } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange, fmtCtx, fmtPrice } from '../lib/format';
import { labColor } from '../lib/colors';

export type SortKey = 'combined' | 'oc' | 'or' | 'name' | 'ctx' | 'price' | 'rel';

export function sortModels(models: ModelRow[], sort: SortKey | string, dir: 'asc' | 'desc', metric: Metric): ModelRow[] {
  const m = dir === 'asc' ? 1 : -1;
  return [...models].sort((a, b) => {
    switch (sort) {
      case 'oc': return ((tokensOf(a, 'opencode', metric) ?? -1) - (tokensOf(b, 'opencode', metric) ?? -1)) * m;
      case 'or': return ((tokensOf(a, 'openrouter', metric) ?? -1) - (tokensOf(b, 'openrouter', metric) ?? -1)) * m;
      case 'name': return a.name.localeCompare(b.name) * m;
      case 'ctx': return (((a.meta.contextTokens ?? -1)) - ((b.meta.contextTokens ?? -1))) * m;
      case 'price': return (((a.meta.pricing?.input ?? a.meta.orPricing?.input ?? -1)) - ((b.meta.pricing?.input ?? b.meta.orPricing?.input ?? -1))) * m;
      case 'rel': return ((a.meta.releaseDate || '').localeCompare(b.meta.releaseDate || '')) * m;
      case 'combined':
      default: return ((combinedTokens(a, metric) ?? -1) - (combinedTokens(b, metric) ?? -1)) * m;
    }
  });
}

function Change({ v, isNew }: { v: number | null; isNew?: boolean }) {
  const c = fmtChange(v, isNew);
  const cls = c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)';
  return <span className={`num text-[12.5px] ${cls}`}>{c.text}</span>;
}

export function StatusText({ status }: { status: ModelRow['status'] }) {
  const label = status === 'matched' ? 'both sources' : status === 'opencode-only' ? 'OC only' : 'OR only';
  return <span className="t-label whitespace-nowrap text-(--muted)">{label}</span>;
}

const COLS: Array<{ key: SortKey; label: string; sortable: boolean; align: 'left' | 'right' }> = [
  { key: 'name', label: 'Model', sortable: true, align: 'left' },
  { key: 'combined', label: 'Combined', sortable: true, align: 'right' },
  { key: 'oc', label: 'OpenCode', sortable: true, align: 'right' },
  { key: 'or', label: 'OpenRouter', sortable: true, align: 'right' },
  { key: 'ctx', label: 'Context', sortable: true, align: 'right' },
  { key: 'price', label: 'Price $/1M', sortable: true, align: 'right' },
  { key: 'rel', label: 'Released', sortable: true, align: 'right' },
];

export default function ModelTable({ metric, rows, sort, dir, onSort, onSelect, page, perPage, onPage, onPerPage }: {
  data: DataFile; metric: Metric; rows: ModelRow[]; sort: string; dir: 'asc' | 'desc';
  onSort: (k: string) => void; onSelect: (k: string) => void; page: number; perPage: number; onPage: (p: number) => void; onPerPage: (n: number) => void;
}) {
  const totalPages = Math.max(1, Math.ceil(rows.length / perPage));
  const safePage = Math.min(Math.max(page, 1), totalPages);
  const start = (safePage - 1) * perPage;
  const pageRows = rows.slice(start, start + perPage);
  const end = start + pageRows.length;
  void onPerPage;
  return (
    <div className="tu-table-shell">
      <div className="tu-table-view">
        <table className="tu-sticky-table w-full min-w-[880px] text-left text-[14px]">
          <thead>
            <tr>
              {COLS.map((c) => (
                <th key={c.key} scope="col" aria-sort={sort === c.key ? (dir === 'asc' ? 'ascending' : 'descending') : undefined} className={`t-label px-3 py-2 pl-0 font-medium text-(--muted) last:pr-0 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                  {c.sortable ? (
                    <button onClick={() => onSort(c.key)} className="tu-row-hover hover:text-(--ink)">
                      {c.label}{sort === c.key ? (dir === 'asc' ? ' ↑' : ' ↓') : ''}
                    </button>
                  ) : c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pageRows.map((m) => {
              const oc = tokensOf(m, 'opencode', metric);
              const or = tokensOf(m, 'openrouter', metric);
              const mod = modalityOf(m);
              return (
                <tr key={m.key} onClick={() => onSelect(m.key)} onKeyDown={(e) => e.key === 'Enter' && onSelect(m.key)} tabIndex={0} className="tu-row-hover cursor-pointer border-b border-(--rule) hover:bg-(--paper-deep)">
                  <td className="max-w-[300px] py-2.5 pl-0 pr-4">
                    <span className="flex items-baseline gap-2">
                      <span className="mt-1 h-[7px] w-[7px] shrink-0 self-center" style={{ background: labColor(m.lab) }} aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block truncate text-[14px] font-medium" title={m.name}>{m.name}</span>
                        <span className="block truncate text-[12.5px] text-(--muted)">{mod ? `${m.labName} · ${mod}` : m.labName}{m.stale ? ' · stale' : ''}</span>
                      </span>
                    </span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-0 pr-6 text-right">
                    <span><span className="num text-[15px] font-medium">{fmtTokens(combinedTokens(m, metric))}</span> <span className="num text-[12.5px] text-(--muted)">{fmtShare(combinedShare(m, metric))}</span><br /><Change v={m.combined.changeWeek} isNew={m.combined.changeIsNew} /></span>
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-0 pr-6 text-right">
                    {oc == null ? <span className="text-(--muted)" title="No OpenCode data">—</span> : (
                      <span><span className="num text-[13.5px]">{fmtTokens(oc)}</span> <span className="num text-[12px] text-(--muted)">{fmtShare(shareOf(m, 'opencode', metric))}</span></span>
                    )}
                  </td>
                  <td className="whitespace-nowrap py-2.5 pl-0 pr-6 text-right">
                    {or == null ? <span className="text-(--muted)" title="No OpenRouter data">—</span> : (
                      <span><span className="num text-[13.5px]">{fmtTokens(or)}</span> <span className="num text-[12px] text-(--muted)">{fmtShare(shareOf(m, 'openrouter', metric))}</span></span>
                    )}
                  </td>
                  <td className="num whitespace-nowrap py-2.5 pl-0 pr-6 text-right text-[13.5px]">{fmtCtx(m.meta.contextTokens)}</td>
                  <td className="num whitespace-nowrap py-2.5 pl-0 pr-6 text-right text-[13px]">{fmtPrice(m.meta.pricing?.input ?? m.meta.orPricing?.input)} / {fmtPrice(m.meta.pricing?.output ?? m.meta.orPricing?.output)}</td>
                  <td className="num whitespace-nowrap py-2.5 pl-0 pr-0 text-right text-[13px] text-(--muted)">{m.meta.releaseDate || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="tu-cards-view">
        {pageRows.map((m) => {
          const mix = sourceMix(m, metric);
          const mod = modalityOf(m);
          return (
            <button key={m.key} onClick={() => onSelect(m.key)} className="tu-row-hover block w-full border-b border-(--rule) py-3 text-left hover:bg-(--paper-deep)">
              <span className="flex items-baseline gap-2">
                <span className="h-[7px] w-[7px] shrink-0" style={{ background: labColor(m.lab) }} aria-hidden="true" />
                <span className="flex-1 truncate text-[14px] font-medium">{m.name}</span>
                <StatusText status={m.status} />
              </span>
              <span className="mt-1 flex h-[4px] w-full" aria-hidden="true">
                <span className="h-full" style={{ width: `${mix.oc * 100}%`, background: 'var(--oc)' }} />
                <span className="h-full" style={{ width: `${mix.or * 100}%`, background: 'var(--or)' }} />
              </span>
              <span className="num mt-1.5 grid grid-cols-2 gap-2 text-[13px]">
                <span>Combined <b>{fmtTokens(combinedTokens(m, metric))}</b> <span className="text-(--muted)">{fmtShare(combinedShare(m, metric))}</span></span>
                <span>OC <b>{fmtTokens(tokensOf(m, 'opencode', metric))}</b> · OR <b>{fmtTokens(tokensOf(m, 'openrouter', metric))}</b></span>
              </span>
              <span className="t-label mt-0.5 text-(--muted)">{mod ? `${m.labName} · ${mod}` : m.labName}</span>
            </button>
          );
        })}
      </div>
      <div className="t-meta flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2.5 text-(--muted)">
        <span className="num">{rows.length ? `${start + 1}–${end} of ${rows.length}` : '0 models'} · p. {safePage} of {totalPages}</span>
        <span className="flex items-center gap-4">
          <label className="flex items-center gap-1.5">
            <span>Rows</span>
            <select value={perPage} onChange={(e) => onPerPage(parseInt(e.target.value, 10))} aria-label="Rows per page" className="bg-transparent py-1 text-[14px] outline-none">
              {[25, 50, 100, 250].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button disabled={safePage <= 1} onClick={() => onPage(safePage - 1)} className="tu-row-hover underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40">Prev</button>
          <button disabled={safePage >= totalPages} onClick={() => onPage(safePage + 1)} className="tu-row-hover underline-offset-2 hover:underline disabled:no-underline disabled:opacity-40">Next</button>
        </span>
      </div>
    </div>
  );
}
