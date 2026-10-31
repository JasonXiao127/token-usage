import type { DataFile, Metric } from '../../shared/types';
import { topCombined, combinedShare } from '../lib/derive';
import { fmtShare } from '../lib/format';

export default function Lede({ data, metric }: { data: DataFile; metric: Metric }) {
  const top = topCombined(data, metric, 1)[0];
  const share = top ? combinedShare(top, metric) : null;
  return (
    <div className="max-w-[30ch]">
      <h1 className="font-display t-hero font-medium leading-[1.08] tracking-[-0.02em]">
        {top ? `${top.name} is the most-used model` : 'Global model usage'}
        {share != null ? `, with ${fmtShare(share)} of combined observed tokens` : ''}.
      </h1>
      <p className="t-data mt-3 leading-relaxed text-(--muted)">
        Combined observed tokens across OpenCode Data and OpenRouter, complete UTC days.
      </p>
    </div>
  );
}
