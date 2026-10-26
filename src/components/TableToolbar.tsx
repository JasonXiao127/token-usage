import type { DashboardState } from '../lib/urlState';
import type { DataFile } from '../../shared/types';

export default function TableToolbar({ data, state, onPatch }: { data: DataFile; state: DashboardState; onPatch: (p: Partial<DashboardState>) => void }) {
  const labs = [...data.labs].sort((a, b) => a.name.localeCompare(b.name));
  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        value={state.q}
        onChange={(e) => onPatch({ q: e.target.value, page: 1 })}
        placeholder="Search model, id, lab…"
        aria-label="Search models"
        className="w-56 rounded-xl border border-neutral-200 bg-white px-3 py-2 text-[13px] outline-none placeholder:text-neutral-400 focus:border-teal-500 dark:border-neutral-700 dark:bg-neutral-900 dark:text-neutral-100"
      />
      <select value={state.lab} onChange={(e) => onPatch({ lab: e.target.value, page: 1 })} aria-label="Filter by lab" className="rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-[13px] dark:border-neutral-700 dark:bg-neutral-900">
        <option value="">All labs</option>
        {labs.map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
      </select>
      <select value={state.status} onChange={(e) => onPatch({ status: e.target.value as DashboardState['status'], page: 1 })} aria-label="Filter by status" className="rounded-xl border border-neutral-200 bg-white px-2.5 py-2 text-[13px] dark:border-neutral-700 dark:bg-neutral-900">
        <option value="">All statuses</option>
        <option value="matched">Matched (both)</option>
        <option value="opencode-only">OpenCode only</option>
        <option value="openrouter-only">OpenRouter only</option>
      </select>
      <label className="flex items-center gap-1.5 text-[13px] text-neutral-600 dark:text-neutral-300">
        <input type="checkbox" checked={state.hasUsage} onChange={(e) => onPatch({ hasUsage: e.target.checked, page: 1 })} className="accent-teal-600" />
        Has usage
      </label>
      <label className="flex items-center gap-1.5 text-[13px] text-neutral-600 dark:text-neutral-300" title="Show catalog models with zero usage">
        <input type="checkbox" checked={state.showAll} onChange={(e) => onPatch({ showAll: e.target.checked, page: 1 })} className="accent-teal-600" />
        Show all catalog
      </label>
      {(state.q || state.lab || state.status || !state.hasUsage || state.showAll) && (
        <button onClick={() => onPatch({ q: '', lab: '', status: '', hasUsage: true, showAll: false, page: 1 })} className="rounded-xl px-2.5 py-2 text-[13px] text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
          Clear
        </button>
      )}
    </div>
  );
}
