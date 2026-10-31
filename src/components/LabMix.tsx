import type { DataFile, Metric } from '../../shared/types';
import { labBreakdown, modelsWithUsage } from '../lib/derive';
import { labColor } from '../lib/colors';
import { fmtTokens, fmtShare } from '../lib/format';

function winNoun(metric: Metric): string {
  if (metric === 'day') return '1 day';
  if (metric === 'month') return '30 days';
  return '7 days';
}

export default function LabMix({ data, metric, activeLab, onLab }: { data: DataFile; metric: Metric; activeLab: string; onLab: (lab: string) => void }) {
  const total = data.totals.combined[metric] ?? 0;
  const rows = labBreakdown(data, metric, 6);
  void modelsWithUsage;
  return (
    <section aria-label="Lab mix">
      <h2 className="text-[15px] font-semibold">Lab mix</h2>
      <p className="t-meta mt-0.5 text-(--muted)">Share of combined tokens · {winNoun(metric)}. Select a segment to filter the table.</p>
      <div className="mt-3">
        <div className="t-label mb-1 flex items-baseline justify-between text-(--muted)">
          <span>Combined · excl. OpenRouter BYOK</span>
          <span className="num">{fmtTokens(total)}</span>
        </div>
        <div className="flex h-[14px] w-full">
          {rows.map((r) => {
            const pct = total ? (r.tokens / total) * 100 : 0;
            if (pct < 0.5) return null;
            if (r.isOther) {
              return (
                <span
                  key={r.id}
                  title={`Other: ${fmtTokens(r.tokens)} (${fmtShare(r.share)})`}
                  className="h-full"
                  style={{ width: `${pct}%`, background: 'var(--rule)' }}
                  aria-hidden="true"
                />
              );
            }
            return (
              <button
                key={r.id}
                onClick={() => onLab(r.id)}
                title={`${r.name}: ${fmtTokens(r.tokens)} (${fmtShare(r.share)} of combined) — filter table`}
                className="tu-row-hover h-full hover:opacity-75"
                style={{ width: `${pct}%`, background: labColor(r.id) }}
                aria-label={`Filter to ${r.name}`}
                aria-pressed={activeLab === r.id}
              />
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap gap-x-2 gap-y-1">
          {rows.map((r) => (
            r.isOther ? (
              <span key={r.id} className="t-label -mx-1.5 flex min-w-[140px] items-center gap-1.5 px-1.5 py-0.5 text-(--muted)" title={`Other labs: ${fmtShare(r.share)}`}>
                <span className="inline-block h-[7px] w-[7px]" style={{ background: 'var(--rule)' }} />
                <span>Other</span>
                <span className="num ml-auto">{fmtShare(r.share)}</span>
              </span>
            ) : (
              <button
                key={r.id}
                onClick={() => onLab(r.id)}
                title={`${r.name}: ${fmtShare(r.share)} of combined — filter table`}
                aria-pressed={activeLab === r.id}
                className={`t-label tu-row-hover -mx-1.5 flex min-w-[140px] items-center gap-1.5 px-1.5 py-0.5 hover:bg-(--paper-deep) hover:text-(--ink) ${activeLab === r.id ? 'text-(--ink) underline underline-offset-4' : 'text-(--muted)'}`}
              >
                <span className="inline-block h-[7px] w-[7px] shrink-0" style={{ background: labColor(r.id) }} />
                <span className="truncate">{r.name}</span>
                <span className="num ml-auto">{fmtShare(r.share)}</span>
              </button>
            )
          ))}
        </div>
      </div>
    </section>
  );
}
