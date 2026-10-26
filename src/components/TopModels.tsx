import type { DataFile, Metric } from '../../shared/types';
import { topBy, tokensOf } from '../lib/derive';
import { fmtTokens, fmtShare, fmtChange } from '../lib/format';

function List({ title, rows, metric, total, onSelect }: { title: string; rows: ReturnType<typeof topBy>; metric: Metric; total: number; onSelect: (k: string) => void }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <h2 className="mb-2 text-sm font-semibold text-neutral-900 dark:text-neutral-100">{title}</h2>
      <ol className="divide-y divide-neutral-100 dark:divide-neutral-800">
        {rows.map((m, i) => {
          const t = tokensOf(m, title.startsWith('OpenCode') ? 'opencode' : 'openrouter', metric) ?? 0;
          const u = title.startsWith('OpenCode') ? m.opencode : m.openrouter;
          const c = fmtChange(u?.changeWeek ?? null, (u as { changeIsNew?: boolean } | undefined)?.changeIsNew);
          return (
            <li key={m.key}>
              <button onClick={() => onSelect(m.key)} className="flex w-full items-center gap-2.5 py-2 text-left hover:bg-neutral-50 dark:hover:bg-neutral-800/50">
                <span className="num w-5 text-xs text-neutral-400">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-neutral-900 dark:text-neutral-100">{m.name}</span>
                  <span className="block h-1.5 overflow-hidden rounded-full bg-neutral-100 dark:bg-neutral-800">
                    <span className="block h-full rounded-full bg-teal-500" style={{ width: `${Math.min(100, (t / total) * 100 * 8)}%` }} />
                  </span>
                </span>
                <span className="num text-right text-[13px] text-neutral-900 dark:text-neutral-100">{fmtTokens(t)}</span>
                <span className="num hidden w-14 text-right text-[11px] text-neutral-500 sm:block">{fmtShare((t / total) * 100)}</span>
                <span className={`num w-14 text-right text-[11px] ${c.tone === 'up' ? 'text-emerald-600' : c.tone === 'down' ? 'text-rose-500' : 'text-neutral-400'}`}>{c.text}</span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

export default function TopModels({ data, metric, onSelect }: { data: DataFile; metric: Metric; onSelect: (k: string) => void }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      <List title="Top on OpenCode" rows={topBy(data, 'opencode', metric)} metric={metric} total={data.totals.opencode[metric] ?? 1} onSelect={onSelect} />
      <List title="Top on OpenRouter" rows={topBy(data, 'openrouter', metric)} metric={metric} total={data.totals.openrouter[metric] ?? 1} onSelect={onSelect} />
    </div>
  );
}
