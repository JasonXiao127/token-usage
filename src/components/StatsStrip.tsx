import type { DataFile, Metric } from '../../shared/types';
import { fmtTokens, fmtShare } from '../lib/format';

function Stat({ label, value, sub, first }: { label: string; value: string; sub: string; first?: boolean }) {
  return (
    <div className={`${first ? '' : 'border-l border-(--rule)'} px-4 first:pl-0`}>
      <div className="text-[11px] text-(--muted)">{label}</div>
      <div className="num mt-0.5 text-[22px] font-medium leading-none tracking-[-0.02em]">{value}</div>
      <div className="num mt-1 text-[11px] text-(--muted)">{sub}</div>
    </div>
  );
}

export default function StatsStrip({ data, metric }: { data: DataFile; metric: Metric }) {
  const total = data.totals.combined[metric] ?? 0;
  const oc = data.totals.opencode[metric] ?? 0;
  const or = data.totals.openrouter[metric] ?? 0;
  const ocModels = data.totals.opencodeModelsWithUsage[metric] ?? 0;
  const orModels = data.totals.openrouterModelsWithUsage[metric] ?? 0;
  const winLabel = metric === 'day' ? data.window.day : metric === 'week' ? `${data.window.weekStart} – ${data.window.end}` : `${data.window.monthStart} – ${data.window.end}`;
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-y-4 border-y border-(--rule) py-4 md:grid-cols-4">
      <Stat first label="Combined observed tokens" value={fmtTokens(total)} sub={winLabel} />
      <Stat label="Observed on OpenCode" value={fmtTokens(oc)} sub={`${fmtShare(total ? (oc / total) * 100 : null)} of combined`} />
      <Stat label="Observed on OpenRouter" value={fmtTokens(or)} sub={`${fmtShare(total ? (or / total) * 100 : null)} of combined · excl. BYOK`} />
      <Stat label="Models with usage" value={`${ocModels} · ${orModels}`} sub={`OpenCode · OpenRouter · ${data.match.matchedGroups} in both`} />
    </section>
  );
}
