import type { DashboardState } from '../lib/urlState';
import type { DataFile } from '../../shared/types';

export default function TableToolbar({ data, state, onPatch }: { data: DataFile; state: DashboardState; onPatch: (p: Partial<DashboardState>) => void }) {
  const labs = [...data.labs].sort((a, b) => a.name.localeCompare(b.name));
  const inputCls = "border-b border-(--rule) bg-transparent px-0 py-1.5 text-[13px] outline-none placeholder:text-(--muted) focus:border-(--ink)";
  return (
    <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
      <input
        value={state.q}
        onChange={(e) => onPatch({ q: e.target.value, page: 1 })}
        placeholder="Search model, id, lab…"
        aria-label="Search models"
        className={`w-56 ${inputCls}`}
      />
      <label className="flex items-center gap-2 text-[13px]">
        <span className="text-(--muted)">Lab</span>
        <select value={state.lab} onChange={(e) => onPatch({ lab: e.target.value, page: 1 })} aria-label="Filter by lab" className="bg-transparent py-1.5 text-[13px] outline-none">
          <option value="">All</option>
          {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
        </select>
      </label>
      <label className="flex items-center gap-2 text-[13px]">
        <span className="text-(--muted)">Source</span>
        <select value={state.status} onChange={(e) => onPatch({ status: e.target.value as DashboardState['status'], page: 1 })} aria-label="Filter by source" className="bg-transparent py-1.5 text-[13px] outline-none">
          <option value="">Matched + single</option>
          <option value="matched">Both</option>
          <option value="opencode-only">OpenCode only</option>
          <option value="openrouter-only">OpenRouter only</option>
        </select>
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-(--muted)">
        <input type="checkbox" checked={state.hasUsage} onChange={(e) => onPatch({ hasUsage: e.target.checked, page: 1 })} className="accent-[#1E4E8C]" />
        Has usage
      </label>
      <label className="flex cursor-pointer items-center gap-1.5 text-[13px] text-(--muted)" title="Show catalog models with zero usage">
        <input type="checkbox" checked={state.showAll} onChange={(e) => onPatch({ showAll: e.target.checked, page: 1 })} className="accent-[#1E4E8C]" />
        Show all catalog
      </label>
      {(state.q || state.lab || state.status || !state.hasUsage || state.showAll) && (
        <button onClick={() => onPatch({ q: '', lab: '', status: '', hasUsage: true, showAll: false, page: 1 })} className="text-[13px] text-(--muted) underline-offset-2 hover:text-(--ink) hover:underline">
          Clear
        </button>
      )}
    </div>
  );
}
