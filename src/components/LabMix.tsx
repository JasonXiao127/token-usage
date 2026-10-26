import type { DataFile } from '../../shared/types';
import { labColor } from '../lib/colors';
import { fmtTokens, fmtShare } from '../lib/format';

export default function LabMix({ data, onLab }: { data: DataFile; onLab: (lab: string) => void }) {
  const total = data.totals.combined.week ?? 1;
  const rows = [...data.labs]
    .map((l) => ({ id: l.id, name: l.name, v: l.combinedTokensWeek ?? l.opencodeTokensWeek + l.openrouterTokensWeek }))
    .sort((a, b) => b.v - a.v)
    .slice(0, 8);
  const shown = rows.reduce((s, r) => s + r.v, 0);
  return (
    <section aria-label="Lab mix">
      <h2 className="text-[13px] font-semibold">Lab mix, past 7 days</h2>
      <p className="mt-0.5 text-[12px] text-(--muted)">Share of combined tokens. Select a segment to filter the table.</p>
      <div className="mt-3">
        <div className="mb-1 flex items-baseline justify-between text-[11px] text-(--muted)">
          <span>Combined · excl. OpenRouter BYOK</span>
          <span className="num">{fmtTokens(total)}</span>
        </div>
        <div className="flex h-[10px] w-full">
          {rows.map((r) => {
            const pct = shown ? (r.v / shown) * 100 : 0;
            if (pct < 0.5) return null;
            return (
              <button
                key={r.id}
                onClick={() => onLab(r.id)}
                title={`${r.name}: ${fmtTokens(r.v)} (${fmtShare((r.v / total) * 100)})`}
                className="h-full hover:opacity-75"
                style={{ width: `${pct}%`, background: labColor(r.id) }}
                aria-label={`Filter to ${r.name}`}
              />
            );
          })}
        </div>
        <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
          {rows.map((r) => (
            <button key={r.id} onClick={() => onLab(r.id)} className="flex items-center gap-1.5 text-[11px] text-(--muted) hover:text-(--ink)">
              <span className="inline-block h-[7px] w-[7px]" style={{ background: labColor(r.id) }} />
              {r.name}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
