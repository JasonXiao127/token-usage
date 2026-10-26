import type { DataFile, Metric } from '../../shared/types';
import { topCombined, combinedShare } from '../lib/derive';
import { fmtShare, fmtTokens } from '../lib/format';

export default function Lede({ data, metric }: { data: DataFile; metric: Metric }) {
  const top = topCombined(data, metric, 1)[0];
  const share = top ? combinedShare(top, metric) : null;
  const total = data.totals.combined[metric] ?? 0;
  const oc = data.totals.opencode[metric] ?? 0;
  const or = data.totals.openrouter[metric] ?? 0;
  const win = metric === 'day' ? data.window.day : metric === 'week' ? `${data.window.weekStart} – ${data.window.end}` : `${data.window.monthStart} – ${data.window.end}`;
  return (
    <div className="max-w-[68ch]">
      <h1 className="font-display text-[26px] font-medium leading-[1.15] tracking-[-0.015em] sm:text-[32px]">
        {top ? `${top.name} is the most-used model` : 'Global model usage'}
        {share != null ? `, with ${fmtShare(share)} of combined observed tokens` : ''}.
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        Window {win} · {fmtTokens(total)} tokens observed across OpenCode ({fmtShare(total ? (oc / total) * 100 : null)}) and OpenRouter ({fmtShare(total ? (or / total) * 100 : null)}) · {data.match.matchedGroups} models seen in both.
      </p>
    </div>
  );
}
