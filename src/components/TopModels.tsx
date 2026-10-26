import type { DataFile, Metric } from '../../shared/types';
import { topCombined, combinedTokens, combinedShare, sourceMix } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange } from '../lib/format';

export default function TopModels({ data, metric, onSelect }: { data: DataFile; metric: Metric; onSelect: (k: string) => void }) {
  const rows = topCombined(data, metric, 10);
  const total = data.totals.combined[metric] ?? 1;
  return (
    <section aria-label="Top models">
      <h2 className="border-b border-(--rule) pb-2 text-[13px] font-semibold">Top models</h2>
      <ol>
        {rows.map((m, i) => {
          const t = combinedTokens(m, metric) ?? 0;
          const mix = sourceMix(m, metric);
          const c = fmtChange(m.combined.changeWeek, m.combined.changeIsNew);
          return (
            <li key={m.key} className="border-b border-(--rule)">
              <button onClick={() => onSelect(m.key)} className="flex w-full items-center gap-3 py-2 text-left">
                <span className="num w-6 shrink-0 text-[13px] text-(--muted)">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium">{m.name}</span>
                  <span className="mt-[3px] flex h-[3px] w-24" title={`OpenCode ${fmtShare(mix.oc * 100)} · OpenRouter ${fmtShare(mix.or * 100)}`} aria-hidden="true">
                    <span className="h-full" style={{ width: `${mix.oc * 100}%`, background: 'var(--oc)' }} />
                    <span className="h-full" style={{ width: `${mix.or * 100}%`, background: 'var(--or)' }} />
                  </span>
                </span>
                <span className="num shrink-0 text-[13px]">{fmtTokens(t)}</span>
                <span className="num hidden w-14 shrink-0 text-right text-[11px] text-(--muted) sm:inline">{fmtShare((t / total) * 100)}</span>
                <span className={`num w-14 shrink-0 text-right text-[11px] ${c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)'}`}>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
