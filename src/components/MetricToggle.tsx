import type { Metric } from '../../shared/types';

const ORDER: Metric[] = ['day', 'week', 'month'];
const LABEL: Record<Metric, string> = { day: '1d', week: '7d', month: '30d' };

export default function MetricToggle({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return (
    <div className="inline-flex rounded-xl border border-neutral-200 bg-white p-1 dark:border-neutral-700 dark:bg-neutral-900" role="tablist" aria-label="Metric window">
      {ORDER.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={value === m}
          onClick={() => onChange(m)}
          className={`rounded-lg px-3.5 py-1.5 text-[13px] font-medium transition ${value === m ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900' : 'text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100'}`}
        >
          {LABEL[m]}
        </button>
      ))}
    </div>
  );
}
