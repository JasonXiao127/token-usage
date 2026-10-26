import type { DataFile, Metric } from '../../shared/types';
import { labColor } from '../lib/colors';
import { fmtTokens, fmtShare } from '../lib/format';

export default function LabMix({ data, metric, onLab }: { data: DataFile; metric: Metric; onLab: (lab: string) => void }) {
  const ocTotal = data.totals.opencode[metric] ?? 1;
  const orTotal = data.totals.openrouter[metric] ?? 1;
  void metric;
  const rows = [...data.labs]
    .sort((a, b) => b.opencodeTokensWeek + b.openrouterTokensWeek - (a.opencodeTokensWeek + a.openrouterTokensWeek))
    .slice(0, 8)
    .map((l) => ({ id: l.id, name: l.name, oc: l.opencodeTokensWeek, or: l.openrouterTokensWeek }));
  const total = (side: 'oc' | 'or') => rows.reduce((s, r) => s + (side === 'oc' ? r.oc : r.or), 0);
  return (
    <section aria-label="Lab mix">
      <h2 className="text-[13px] font-semibold">Lab mix, past 7 days</h2>
      <p className="mt-0.5 text-[12px] text-(--muted)">Each ribbon is 100% of its ecosystem. Select a segment to filter the table.</p>
      {(['oc', 'or'] as const).map((side) => (
        <div key={side} className="mt-3">
          <div className="mb-1 flex items-baseline justify-between text-[11px] text-(--muted)">
            <span>{side === 'oc' ? 'OpenCode' : 'OpenRouter · excl. BYOK'}</span>
            <span className="num">{fmtTokens(side === 'oc' ? ocTotal : orTotal)}</span>
          </div>
          <div className="flex h-[10px] w-full">
            {rows.map((r) => {
              const v = side === 'oc' ? r.oc : r.or;
              const pct = total(side) ? (v / total(side)) * 100 : 0;
              if (pct < 0.5) return null;
              return (
                <button
                  key={r.id}
                  onClick={() => onLab(r.id)}
                  title={`${r.name}: ${fmtTokens(v)} (${fmtShare((v / (side === 'oc' ? ocTotal : orTotal)) * 100)})`}
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
      ))}
    </section>
  );
}
