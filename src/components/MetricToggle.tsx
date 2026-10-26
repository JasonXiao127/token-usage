import type { Metric } from '../../shared/types';

const ORDER: Metric[] = ['day', 'week', 'month'];
const LABEL: Record<Metric, string> = { day: '1d', week: '7d', month: '30d' };

export default function MetricToggle({ value, onChange }: { value: Metric; onChange: (m: Metric) => void }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-(--rule)" role="tablist" aria-label="Metric window">
      {ORDER.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={value === m}
          onClick={() => onChange(m)}
          className="tu-tab num pb-2 text-[13px] text-(--muted) hover:text-(--ink) aria-selected:text-(--ink]"
        >
          {LABEL[m]}
        </button>
      ))}
    </div>
  );
}
