import type { DataFile, Metric } from '../../shared/types';
import { topCombined, combinedTokens, combinedShare, sourceMix } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange } from '../lib/format';

function winNoun(metric: Metric): string {
  if (metric === 'day') return '1 day';
  if (metric === 'month') return '30 days';
  return '7 days';
}

export default function GlobalShare({ data, metric, onSelect }: { data: DataFile; metric: Metric; onSelect: (key: string) => void }) {
  const rows = topCombined(data, metric, 12);
  if (!rows.length) return <p className="t-data py-6 text-(--muted)">No usage for this window.</p>;
  const max = combinedTokens(rows[0]!, metric) ?? 1;

  return (
    <section aria-label="Global ranking">
      <h2 className="text-[15px] font-semibold">Global ranking</h2>
      <p className="t-meta mt-0.5 text-(--muted)">
        Combined observed tokens · top 12 · {winNoun(metric)}. Bars are scaled to the top model; share is of all combined tokens.
      </p>
      <div aria-hidden="true" className="t-label mt-3 hidden grid-cols-[1.25rem_minmax(0,1.35fr)_minmax(5rem,1fr)_4rem_3.25rem_3.75rem] gap-3 text-(--muted) min-[1200px]:grid">
        <span>#</span>
        <span>Model</span>
        <span>Observed</span>
        <span className="text-right">Combined</span>
        <span className="text-right">Share</span>
        <span className="text-right">Δ 7d</span>
      </div>
      <ol className="mt-1">
        {rows.map((m, i) => {
          const t = combinedTokens(m, metric) ?? 0;
          const s = combinedShare(m, metric);
          const mix = sourceMix(m, metric);
          const c = fmtChange(m.combined.changeWeek, m.combined.changeIsNew);
          const w = Math.max((t / max) * 100, t > 0 ? 2 : 0);
          return (
            <li key={m.key} className="border-b border-(--rule) last:border-b-0">
              <button onClick={() => onSelect(m.key)} className="tu-row-hover grid w-full grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 py-2.5 text-left hover:bg-(--paper-deep) min-[1200px]:grid-cols-[1.25rem_minmax(0,1.35fr)_minmax(5rem,1fr)_4rem_3.25rem_3.75rem]">
                <span className="num t-data text-(--muted)">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-medium" title={m.name}>{m.name}</span>
                  <span className="t-label block truncate text-(--muted)">{m.labName}</span>
                  <span className="mt-1.5 block min-[1200px]:hidden" aria-hidden="true">
                    <span className="block h-[14px] w-full bg-transparent">
                      <span className="block h-full bg-(--ink)" style={{ width: `${w}%` }} />
                    </span>
                    <span className="mt-[2px] flex h-[3px]" style={{ width: `${w}%` }}>
                      <span className="h-full" style={{ width: `${mix.oc * 100}%`, background: 'var(--oc)' }} />
                      <span className="h-full" style={{ width: `${mix.or * 100}%`, background: 'var(--or)' }} />
                    </span>
                  </span>
                </span>
                <span className="hidden min-w-0 min-[1200px]:block" aria-hidden="true">
                  <span className="block h-[14px] w-full bg-transparent">
                    <span className="block h-full bg-(--ink)" style={{ width: `${w}%` }} />
                  </span>
                  <span className="mt-[2px] flex h-[4px]" style={{ width: `${w}%` }} title={`OpenCode ${fmtShare(mix.oc * 100)} · OpenRouter ${fmtShare(mix.or * 100)}`}>
                    <span className="h-full" style={{ width: `${mix.oc * 100}%`, background: 'var(--oc)' }} />
                    <span className="h-full" style={{ width: `${mix.or * 100}%`, background: 'var(--or)' }} />
                  </span>
                </span>
                <span className="num hidden text-right text-[15px] min-[1200px]:block">{fmtTokens(t)}</span>
                <span className="num hidden text-right text-[12.5px] text-(--muted) min-[1200px]:block">{fmtShare(s)}</span>
                <span className={`num hidden text-right text-[12.5px] min-[1200px]:block ${c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)'}`}>{c.text}</span>
                <span className="flex items-baseline justify-end gap-2 min-[1200px]:hidden">
                  <span className="num text-[15px]">{fmtTokens(t)}</span>
                  <span className="num w-14 text-right text-[12px] text-(--muted)">{fmtShare(s)}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="t-label mt-2 flex items-center gap-4 text-(--muted)">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[7px] w-[7px]" style={{ background: 'var(--oc)' }} /> OpenCode</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[7px] w-[7px]" style={{ background: 'var(--or)' }} /> OpenRouter</span>
        <span>strip = where observed</span>
      </p>
    </section>
  );
}
