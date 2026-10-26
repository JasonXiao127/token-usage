import type { DataFile, Metric } from '../../shared/types';
import { topCombined, combinedTokens, combinedShare, sourceMix } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange } from '../lib/format';

export default function GlobalShare({ data, metric, onSelect }: { data: DataFile; metric: Metric; onSelect: (key: string) => void }) {
  const rows = topCombined(data, metric, 15);
  if (!rows.length) return <p className="py-6 text-[13px] text-(--muted)">No usage for this window.</p>;
  const max = combinedTokens(rows[0]!, metric) ?? 1;

  return (
    <section aria-label="Top models by combined token share">
      <h2 className="text-[13px] font-semibold">Top models by combined tokens</h2>
      <p className="mt-0.5 text-[12px] text-(--muted)">
        One ranking across both sources. The thin strip under each bar shows where that model&apos;s usage was observed.
      </p>
      <ol className="mt-3">
        {rows.map((m, i) => {
          const t = combinedTokens(m, metric) ?? 0;
          const s = combinedShare(m, metric);
          const mix = sourceMix(m, metric);
          const c = fmtChange(m.combined.changeWeek, m.combined.changeIsNew);
          return (
            <li key={m.key} className="border-b border-(--rule) last:border-b-0">
              <button onClick={() => onSelect(m.key)} className="grid w-full grid-cols-[1.5rem_minmax(0,13rem)_minmax(0,1fr)_auto] items-center gap-3 py-[7px] text-left max-sm:grid-cols-[1.5rem_minmax(0,1fr)_auto]">
                <span className="num text-[13px] text-(--muted)">{i + 1}</span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-medium">{m.name}</span>
                  <span className="block truncate text-[11px] text-(--muted)">{m.labName}</span>
                </span>
                <span className="block min-w-0 max-sm:hidden" aria-hidden="true">
                  <span className="block h-[10px] w-full bg-transparent">
                    <span className="block h-full bg-(--ink)" style={{ width: `${(t / max) * 100}%` }} />
                  </span>
                  <span className="mt-[3px] flex h-[3px] w-full" title={`OpenCode ${fmtShare(mix.oc * 100)} · OpenRouter ${fmtShare(mix.or * 100)}`}>
                    <span className="h-full" style={{ width: `${mix.oc * 100}%`, background: 'var(--oc)' }} />
                    <span className="h-full" style={{ width: `${mix.or * 100}%`, background: 'var(--or)' }} />
                  </span>
                </span>
                <span className="flex items-baseline gap-2">
                  <span className="num text-[13px]">{fmtTokens(t)}</span>
                  <span className="num w-14 text-right text-[11px] text-(--muted)">{fmtShare(s)}</span>
                  <span className={`num hidden w-14 text-right text-[11px] sm:inline ${c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)'}`}>{c.text}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="mt-2 flex items-center gap-4 text-[11px] text-(--muted)">
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[7px] w-[7px]" style={{ background: 'var(--oc)' }} /> OpenCode</span>
        <span className="inline-flex items-center gap-1.5"><span className="inline-block h-[7px] w-[7px]" style={{ background: 'var(--or)' }} /> OpenRouter</span>
        <span>strip = where observed</span>
      </p>
    </section>
  );
}
