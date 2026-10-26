import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import StaleBanner from './components/StaleBanner';
import KpiCards from './components/KpiCards';
import MetricToggle from './components/MetricToggle';
import ShareScatter from './components/ShareScatter';
import LabMix from './components/LabMix';
import TopModels from './components/TopModels';
import ModelTable, { sortModels } from './components/ModelTable';
import TableToolbar from './components/TableToolbar';
import ModelDrawer from './components/ModelDrawer';
import Methodology from './components/Methodology';
import Footer from './components/Footer';
import ErrorBoundary from './components/ErrorBoundary';
import { useData } from './hooks/useData';
import { useDebounced } from './hooks/useUI';
import { DEFAULT_STATE, parseState, serializeState, type DashboardState } from './lib/urlState';
import { tokensOf } from './lib/derive';
import { modalityOf } from './lib/derive';

const PER_PAGE = 100;

export default function App() {
  const { data, error, loading } = useData();
  const [state, setState] = useState<DashboardState>(() => parseState(window.location.search));
  const q = useDebounced(state.q, 200);

  useEffect(() => {
    const s = serializeState(state);
    const url = window.location.pathname + s + window.location.hash;
    window.history.replaceState(null, '', url);
  }, [state]);

  // open drawer via ?model=
  useEffect(() => {
    const onPop = () => setState((s) => ({ ...s, model: parseState(window.location.search).model }));
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const patch = (p: Partial<DashboardState>) => setState((s) => ({ ...s, ...p }));

  const filtered = useMemo(() => {
    if (!data) return [];
    const ql = q.trim().toLowerCase();
    return data.models.filter((m) => {
      if (state.lab && m.lab !== state.lab) return false;
      if (state.status && m.status !== state.status) return false;
      if (state.hasUsage && !state.showAll) {
        const has = (m.opencode?.tokens[state.metric] ?? 0) > 0 || (m.openrouter?.tokens[state.metric] ?? 0) > 0;
        if (!has) return false;
      } else if (state.hasUsage && state.showAll) {
        // showAll overrides hasUsage filter
      } else if (!state.hasUsage && !state.showAll) {
        const has = (m.opencode?.tokens[state.metric] ?? 0) > 0 || (m.openrouter?.tokens[state.metric] ?? 0) > 0;
        if (has) return false;
      }
      if (ql && !(m.name.toLowerCase().includes(ql) || m.key.toLowerCase().includes(ql) || m.labName.toLowerCase().includes(ql) || m.lab.toLowerCase().includes(ql))) return false;
      void modalityOf;
      return true;
    });
  }, [data, q, state.lab, state.status, state.hasUsage, state.showAll, state.metric]);

  const sorted = useMemo(() => sortModels(filtered, state.sort, state.dir, state.metric), [filtered, state.sort, state.dir, state.metric]);
  const totalOcWeek = useMemo(() => data?.models.reduce((s, m) => s + (m.opencode?.tokens.week || 0), 0) ?? 0, [data]);
  void totalOcWeek;

  const openModel = data?.models.find((m) => m.key === state.model) || null;

  const select = (key: string) => {
    setState((s) => ({ ...s, model: key }));
    window.history.pushState(null, '', window.location.pathname + serializeState({ ...state, model: key }));
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-100">
        {data && <Header generatedAt={data.generatedAt} windowEnd={data.window.end} ocUpdated={data.window.opencodeUpdatedAt} orAsOf={data.window.openrouterAsOf} />}
        <main className="mx-auto max-w-[1400px] space-y-4 px-4 py-4 sm:px-6">
          {loading && (
            <div className="space-y-3" aria-label="Loading">
              {[0, 1, 2].map((i) => <div key={i} className="h-24 animate-pulse rounded-2xl bg-neutral-200 dark:bg-neutral-800" />)}
            </div>
          )}
          {error && (
            <div className="rounded-2xl border border-rose-300 bg-rose-50 p-6 text-center dark:border-rose-800 dark:bg-rose-900/20">
              <p className="font-medium">Data could not be loaded: {error.message}</p>
              <p className="mt-1 text-sm text-neutral-500">Check the <a className="underline" href="https://github.com/JasonXiao127/token-usage/actions">Actions tab</a> or <a className="underline" href="./data/usage.json">raw JSON</a>.</p>
              <button onClick={() => window.location.reload()} className="mt-3 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white dark:bg-white dark:text-neutral-900">Retry</button>
            </div>
          )}
          {data && (
            <>
              <StaleBanner generatedAt={data.generatedAt} />
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h1 className="text-xl font-semibold">Which models are winning real usage?</h1>
                  <p className="text-[13px] text-neutral-500 dark:text-neutral-400">Separate ecosystems — shares are relative to each source. Do not add the two totals.</p>
                </div>
                <MetricToggle value={state.metric} onChange={(metric) => patch({ metric, page: 1 })} />
              </div>
              <KpiCards data={data} metric={state.metric} />
              <div className="grid gap-3 xl:grid-cols-2">
                <ShareScatter data={data} metric={state.metric} onSelect={select} />
                <LabMix data={data} metric={state.metric} onLab={(lab) => patch({ lab, page: 1 })} />
              </div>
              <TopModels data={data} metric={state.metric} onSelect={select} />
              <div className="space-y-2">
                <TableToolbar data={data} state={state} onPatch={patch} />
                <ModelTable
                  data={data} metric={state.metric} rows={sorted} sort={state.sort} dir={state.dir}
                  onSort={(k) => patch(state.sort === k ? { dir: state.dir === 'asc' ? 'desc' : 'asc' } : { sort: k, dir: 'desc' })}
                  onSelect={select} page={state.page} perPage={PER_PAGE} onPage={(page) => patch({ page })}
                />
              </div>
              <Methodology data={data} />
            </>
          )}
        </main>
        <Footer />
        <ModelDrawer model={openModel} metric={state.metric} onClose={() => { patch({ model: '' }); window.history.pushState(null, '', window.location.pathname + serializeState({ ...state, model: '' })); }} />
      </div>
    </ErrorBoundary>
  );
}

// keep import used
export { tokensOf };
