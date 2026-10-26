import type { DataFile, Metric } from '../../shared/types';
import { fmtTokens, fmtShare } from '../lib/format';

function Card({ label, value, sub, accent }: { label: string; value: string; sub: string; accent: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 dark:text-neutral-400">
        <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
        {label}
      </div>
      <div className="num mt-1 text-2xl font-semibold text-neutral-900 dark:text-neutral-50">{value}</div>
      <div className="mt-0.5 text-xs text-neutral-500 dark:text-neutral-400">{sub}</div>
    </div>
  );
}

export default function KpiCards({ data, metric }: { data: DataFile; metric: Metric }) {
  const oc = data.totals.opencode[metric] ?? 0;
  const or = data.totals.openrouter[metric] ?? 0;
  const ocModels = data.totals.opencodeModelsWithUsage[metric] ?? 0;
  const orModels = data.totals.openrouterModelsWithUsage[metric] ?? 0;
  const cov = data.match.openrouterTokenCoverage[metric];
  const winLabel = metric === 'day' ? data.window.day : metric === 'week' ? `${data.window.weekStart} → ${data.window.end}` : `${data.window.monthStart} → ${data.window.end}`;
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Card label="OpenCode tokens" value={fmtTokens(oc)} sub={winLabel} accent="#0d9488" />
      <Card label="OpenRouter tokens" value={fmtTokens(or)} sub={`${winLabel} · excl. BYOK`} accent="#7c3aed" />
      <Card label="Models with usage" value={`${ocModels} · ${orModels}`} sub={`OC · OR · ${data.totals.matchedModels} matched`} accent="#64748b" />
      <Card label="OR tokens matched" value={cov == null ? '—' : cov.toFixed(1) + '%'} sub={`${data.match.matchedGroups} matched groups · ${fmtShare(data.match.opencodeTokenCoverage[metric])} of OC`} accent="#f59e0b" />
    </div>
  );
}
