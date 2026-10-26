import type { DataFile, Metric } from '../../shared/types';
import { topBy } from '../lib/derive';
import { fmtShare } from '../lib/format';

export default function Lede({ data, metric }: { data: DataFile; metric: Metric }) {
  const oc = topBy(data, 'opencode', metric, 1)[0];
  const or = topBy(data, 'openrouter', metric, 1)[0];
  const ocShare = oc?.opencode?.share[metric];
  const orShare = or?.openrouter?.share[metric];
  const win = metric === 'day' ? data.window.day : metric === 'week' ? `${data.window.weekStart} – ${data.window.end}` : `${data.window.monthStart} – ${data.window.end}`;
  return (
    <div className="max-w-[68ch]">
      <h1 className="font-display text-[26px] font-medium leading-[1.15] tracking-[-0.015em] sm:text-[32px]">
        {oc ? `${oc.name} leads OpenCode` : 'Model usage index'}
        {ocShare != null ? ` with ${fmtShare(ocShare)} of tokens` : ''}.
        {or ? ` On OpenRouter, ${or.name} is first${orShare != null ? ` at ${fmtShare(orShare)}` : ''}.` : ''}
      </h1>
      <p className="mt-2 text-[13px] leading-relaxed text-(--muted)">
        Window {win} · {data.match.matchedGroups} models appear in both sources ·
        shares are per ecosystem, never added.
      </p>
    </div>
  );
}
