import type { Metric } from '../../shared/types';

const ORDER: Metric[] = ['day', 'week', 'month'];
const SHORT: Record<Metric, string> = { day: '1d', week: '7d', month: '30d' };
const LONG: Record<Metric, string> = { day: '1 day', week: '7 days', month: '30 days' };

export default function MetricToggle({ value, onChange, inline, longLabels }: { value: Metric; onChange: (m: Metric) => void; inline?: boolean; longLabels?: boolean }) {
  const labels = longLabels ? LONG : SHORT;
  if (inline) {
    return (
      <div className="tu-tablist-inline flex flex-none items-baseline gap-3.5 sm:gap-4" role="tablist" aria-label="Metric window">
        {ORDER.map((m) => (
          <button
            key={m}
            role="tab"
            aria-selected={value === m}
            onClick={() => onChange(m)}
            className="tu-tab num t-data text-(--muted) hover:text-(--ink) aria-selected:text-(--ink)"
          >
            {labels[m]}
          </button>
        ))}
      </div>
    );
  }
  return (
    <div className="flex items-baseline gap-4 border-b border-(--rule)" role="tablist" aria-label="Metric window">
      {ORDER.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={value === m}
          onClick={() => onChange(m)}
          className="tu-tab num t-data pb-2 text-(--muted) hover:text-(--ink) aria-selected:text-(--ink)"
        >
          {labels[m]}
        </button>
      ))}
    </div>
  );
}
