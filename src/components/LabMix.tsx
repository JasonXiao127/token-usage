import type { DataFile, Metric } from '../../shared/types';
import { labColor } from '../lib/colors';
import { fmtTokens, fmtShare } from '../lib/format';

export default function LabMix({ data, metric, onLab }: { data: DataFile; metric: Metric; onLab: (lab: string) => void }) {
  const ocTotal = data.totals.opencode[metric] ?? 1;
  const orTotal = data.totals.openrouter[metric] ?? 1;
  const labs = [...data.labs].sort((a, b) => b.opencodeTokensWeek + b.openrouterTokensWeek - (a.opencodeTokensWeek + a.openrouterTokensWeek)).slice(0, 8);
  const rows: Array<{ id: string; name: string; oc: number; or: number }> = labs.map((l) => ({
    id: l.id, name: l.name,
    oc: l.opencodeTokensWeek, // lab table is week-based; scale note below
    or: l.openrouterTokensWeek,
  }));
  void metric;
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">Lab mix (past 7 days)</h2>
      <p className="mb-3 text-[11px] text-neutral-500 dark:text-neutral-400">Each bar is 100% of that ecosystem. Click a segment to filter.</p>
      {(['oc', 'or'] as const).map((side) => {
        const total = side === 'oc' ? rows.reduce((s, r) => s + r.oc, 0) : rows.reduce((s, r) => s + r.or, 0);
        return (
          <div key={side} className="mb-3">
            <div className="mb-1 flex justify-between text-[11px] text-neutral-500">
              <span>{side === 'oc' ? 'OpenCode' : 'OpenRouter · excl. BYOK'}</span>
              <span className="num">{fmtTokens(side === 'oc' ? ocTotal : orTotal)}</span>
            </div>
            <div className="flex h-7 w-full overflow-hidden rounded-lg">
              {rows.map((r) => {
                const v = side === 'oc' ? r.oc : r.or;
                const pct = total ? (v / total) * 100 : 0;
                if (pct < 0.5) return null;
                return (
                  <button
                    key={r.id}
                    onClick={() => onLab(r.id)}
                    title={`${r.name}: ${fmtTokens(v)} (${fmtShare((v / (side === 'oc' ? ocTotal : orTotal)) * 100)})`}
                    className="h-full transition hover:opacity-80"
                    style={{ width: `${pct}%`, background: labColor(r.id) }}
                  />
                );
              })}
            </div>
            <div className="mt-1.5 flex flex-wrap gap-x-3 gap-y-1">
              {rows.map((r) => (
                <button key={r.id} onClick={() => onLab(r.id)} className="flex items-center gap-1 text-[11px] text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-100">
                  <span className="h-2 w-2 rounded-full" style={{ background: labColor(r.id) }} />
                  {r.name}
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
