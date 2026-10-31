import type { DataFile, Metric } from '../../shared/types';
import { fmtTokens, fmtShare } from '../lib/format';
import { modelsWithUsage } from '../lib/derive';

function Stat({ label, value, sub, first }: { label: string; value: string; sub: string; first?: boolean }) {
  return (
    <div className={`${first ? '' : 'min-[1200px]:border-l min-[1200px]:border-(--rule) min-[1200px]:pl-4'} px-4 first:pl-0 max-[1199px]:odd:border-l-0 max-[1199px]:even:border-l max-[1199px]:even:border-(--rule) max-[1199px]:even:pl-4 max-[390px]:even:border-l-0 max-[390px]:even:pl-0`}>
      <div className="t-label text-(--muted)">{label}</div>
      <div className="num t-stat mt-0.5 font-medium leading-none tracking-[-0.02em]">{value}</div>
      <div className="num t-label mt-1 text-(--muted)">{sub}</div>
    </div>
  );
}

function LedgerRow({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-t border-(--rule) py-2 first:border-t-0 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <div className="t-label text-(--muted)">{label}</div>
        <div className="num t-label mt-0.5 text-(--muted)">{sub}</div>
      </div>
      <div className="num t-stat shrink-0 font-medium leading-none tracking-[-0.02em]">{value}</div>
    </div>
  );
}

export default function StatsStrip({ data, metric, variant = 'strip' }: { data: DataFile; metric: Metric; variant?: 'strip' | 'ledger' }) {
  const total = data.totals.combined[metric] ?? 0;
  const oc = data.totals.opencode[metric] ?? 0;
  const or = data.totals.openrouter[metric] ?? 0;
  const withUsage = modelsWithUsage(data, metric);
  const both = data.match.matchedGroups;
  const ocPct = fmtShare(total ? (oc / total) * 100 : null);
  const orPct = fmtShare(total ? (or / total) * 100 : null);

  if (variant === 'ledger') {
    return (
      <section aria-label="Totals">
        <LedgerRow label="Combined observed tokens" value={fmtTokens(total)} sub="OpenCode + OpenRouter" />
        <LedgerRow label="Observed on OpenCode" value={fmtTokens(oc)} sub={`${ocPct} of combined`} />
        <LedgerRow label="Observed on OpenRouter" value={fmtTokens(or)} sub={`${orPct} of combined · excl. BYOK`} />
        <LedgerRow label="Models with usage" value={String(withUsage)} sub={`${both} seen in both`} />
      </section>
    );
  }

  const winLabel = 'OpenCode + OpenRouter';
  return (
    <section aria-label="Totals" className="grid grid-cols-2 gap-y-4 border-y border-(--rule) py-4 md:grid-cols-4">
      <Stat first label="Combined observed tokens" value={fmtTokens(total)} sub={winLabel} />
      <Stat label="Observed on OpenCode" value={fmtTokens(oc)} sub={`${ocPct} of combined`} />
      <Stat label="Observed on OpenRouter" value={fmtTokens(or)} sub={`${orPct} of combined · excl. BYOK`} />
      <Stat label="Models with usage" value={String(withUsage)} sub={`${both} seen in both`} />
    </section>
  );
}
