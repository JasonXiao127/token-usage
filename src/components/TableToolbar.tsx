import type { DashboardState } from '../lib/urlState';
import type { DataFile } from '../../shared/types';

export default function TableToolbar({ data, state, onPatch }: { data: DataFile; state: DashboardState; onPatch: (p: Partial<DashboardState>) => void }) {
  const labs = [...data.labs].sort((a, b) => a.name.localeCompare(b.name));
  const inputCls = "t-input border-b border-(--rule) bg-transparent px-0 py-1.5 outline-none placeholder:text-(--muted) focus:border-(--ink)";
  const selectCls = "t-input bg-transparent py-1.5 outline-none";
  const showClear = state.q || state.lab || state.status || !state.hasUsage || state.showAll;
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <input
        value={state.q}
        onChange={(e) => onPatch({ q: e.target.value, page: 1 })}
        placeholder="Search model, id, lab…"
        aria-label="Search models"
        className={`w-full sm:w-72 ${inputCls}`}
      />
      <label className="t-data flex h-9 items-center gap-2">
        <span className="text-(--muted)">Lab</span>
        <select value={state.lab} onChange={(e) => onPatch({ lab: e.target.value, page: 1 })} aria-label="Filter by lab" className={selectCls}>
          <option value="">All</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="t-data flex h-9 items-center gap-2">
        <span className="text-(--muted)">Coverage</span>
        <select value={state.status} onChange={(e) => onPatch({ status: e.target.value as DashboardState['status'], page: 1 })} aria-label="Filter by coverage" className={selectCls}>
          <option value="">All coverage</option>
          <option value="matched">Both sources</option>
          <option value="opencode-only">OpenCode only</option>
          <option value="openrouter-only">OpenRouter only</option>
        </select>
      </label>
      <label className="t-data flex h-9 cursor-pointer items-center gap-1.5 text-(--muted)">
        <input type="checkbox" checked={state.hasUsage} onChange={(e) => onPatch({ hasUsage: e.target.checked, page: 1 })} className="accent-[#1E4E8C]" />
        Has usage
      </label>
      <label className="t-data flex h-9 cursor-pointer items-center gap-1.5 text-(--muted)" title="Show catalog models with zero usage">
        <input type="checkbox" checked={state.showAll} onChange={(e) => onPatch({ showAll: e.target.checked, page: 1 })} className="accent-[#1E4E8C]" />
        Show all catalog
      </label>
      {showClear && (
        <button onClick={() => onPatch({ q: '', lab: '', status: '', hasUsage: true, showAll: false, page: 1 })} className="t-data tu-row-hover h-9 text-(--muted) underline-offset-2 hover:text-(--ink) hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}
