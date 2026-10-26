import type { DataFile, Metric } from '../../shared/types';
import { topBy, tokensOf } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange } from '../lib/format';

function RankedList({ title, rows, metric, total, onSelect }: { title: string; rows: ReturnType<typeof topBy>; metric: Metric; total: number; onSelect: (k: string) => void }) {
  return (
    <section aria-label={title}>
      <h2 className="border-b border-(--rule) pb-2 text-[13px] font-semibold">{title}</h2>
      <ol>
        {rows.map((m, i) => {
          const t = tokensOf(m, title.startsWith('OpenCode') ? 'opencode' : 'openrouter', metric) ?? 0;
          const u = title.startsWith('OpenCode') ? m.opencode : m.openrouter;
          const c = fmtChange(u?.changeWeek ?? null, (u as { changeIsNew?: boolean } | undefined)?.changeIsNew);
          return (
            <li key={m.key} className="border-b border-(--rule)">
              <button onClick={() => onSelect(m.key)} className="flex w-full items-baseline gap-3 py-2 text-left">
                <span className="num w-6 shrink-0 text-[13px] text-(--muted)">{i + 1}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] font-medium">{m.name}</span>
                <span className="num shrink-0 text-[13px]">{fmtTokens(t)}</span>
                <span className="num hidden w-14 shrink-0 text-right text-[11px] text-(--muted) sm:inline">{fmtShare((t / total) * 100)}</span>
                <span className={`num w-14 shrink-0 text-right text-[11px] ${c.tone === 'up' ? 'text-(--pos)' : c.tone === 'down' ? 'text-(--neg)' : 'text-(--muted)'}`}>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function TopModels({ data, metric, onSelect }: { data: DataFile; metric: Metric; onSelect: (k: string) => void }) {
  return (
    <div className="grid gap-6 md:grid-cols-2">
      <RankedList title="Top on OpenCode" rows={topBy(data, 'opencode', metric)} metric={metric} total={data.totals.opencode[metric] ?? 1} onSelect={onSelect} />
      <RankedList title="Top on OpenRouter" rows={topBy(data, 'openrouter', metric)} metric={metric} total={data.totals.openrouter[metric] ?? 1} onSelect={onSelect} />
    </div>
  );
}
