import type { DataFile } from '../../shared/types';
import { largestMoves, combinedTokens } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange } from '../lib/format';

export default function Movers({ data, onSelect }: { data: DataFile; onSelect: (key: string) => void }) {
  const rows = largestMoves(data, 0.005, 6);
  if (rows.length < 3) return null;
  const total = data.totals.combined.week ?? 1;
  return (
    <section aria-label="Largest moves">
      <h2 className="text-[15px] font-semibold">Largest moves</h2>
      <p className="t-meta mt-0.5 text-(--muted)">Week over week · models ≥0.5% of combined tokens.</p>
      <ol className="mt-2">
        {rows.map((m) => {
          const c = fmtChange(m.combined.changeWeek, m.combined.changeIsNew);
          const share = ((combinedTokens(m, 'week') ?? 0) / total) * 100;
          return (
            <li key={m.key} className="border-b border-(--rule) last:border-b-0">
              <button onClick={() => onSelect(m.key)} className="tu-row-hover flex w-full items-baseline gap-3 py-2 text-left hover:bg-(--paper-deep)" title={`${m.name}: ${fmtTokens(m.combined.tokens.week)} combined · ${c.text} WoW`}>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[14px] font-medium">{m.name}</span>
                  <span className="t-label block truncate text-(--muted)">{m.labName}</span>
                </span>
                <span className="num t-label w-12 shrink-0 text-right text-(--muted)">{fmtShare(share)}</span>
                <span className={`num w-16 shrink-0 text-right text-[13px] ${c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)'}`}>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
      <p className="t-meta mt-3 leading-relaxed text-(--muted)">
        Combined observed tokens = OpenCode + OpenRouter; feeds may overlap. <a href="#methodology" className="underline-offset-2 hover:underline">See methodology</a>.
      </p>
    </section>
  );
}
