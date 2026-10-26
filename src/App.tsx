import { useEffect, useMemo, useState } from 'react';
import Header from './components/Header';
import Lede from './components/Lede';
import StaleBanner from './components/StaleBanner';
import StatsStrip from './components/StatsStrip';
import MetricToggle from './components/MetricToggle';
import GlobalShare from './components/GlobalShare';
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
import { combinedTokens } from './lib/derive';
import { fmtDateUTC } from './lib/format';

const PER_PAGE = 100;

function Rail({ generatedAt, windowEnd, ocUpdated, orAsOf }: { generatedAt: string; windowEnd: string; ocUpdated: string; orAsOf: string }) {
  return (
    <aside className="hidden w-60 shrink-0 lg:block" aria-label="About">
      <div className="sticky top-6 space-y-5 text-[12px]">
        <div>
          <h2 className="text-[11px] text-(--muted)">Window</h2>
          <p className="num mt-0.5">{windowEnd}</p>
          <p className="num mt-0.5 text-(--muted)">complete UTC days</p>
        </div>
        <div>
          <h2 className="text-[11px] text-(--muted)">Observed across</h2>
          <p className="mt-0.5"><a className="text-(--oc) underline-offset-2 hover:underline" href="https://opencode.ai/data/">OpenCode Data</a></p>
          <p className="num mt-0.5 text-(--muted)">{ocUpdated.slice(0, 16).replace('T', ' ')} UTC</p>
          <p className="mt-1.5"><a className="text-(--or) underline-offset-2 hover:underline" href="https://openrouter.ai/rankings">OpenRouter rankings</a></p>
          <p className="num mt-0.5 text-(--muted)">through {orAsOf}</p>
        </div>
        <nav aria-label="Contents">
          <h2 className="text-[11px] text-(--muted)">Contents</h2>
          <ul className="mt-0.5 space-y-1">
            {[['Overview', '#overview'], ['Models', '#models'], ['Methodology', '#methodology']].map(([label, href]) => (
              <li key={href}><a href={href} className="underline-offset-2 hover:underline">{label}</a></li>
            ))}
          </ul>
        </nav>
        <div>
          <h2 className="text-[11px] text-(--muted)">Data</h2>
          <p className="mt-0.5"><a className="underline-offset-2 hover:underline" href={`${import.meta.env.BASE_URL}data/usage.json`} download>Download JSON</a></p>
          <p className="mt-0.5"><a className="underline-offset-2 hover:underline" href="https://github.com/JasonXiao127/token-usage">GitHub</a></p>
          <p className="num mt-1 text-(--muted)" title={generatedAt}>fetched {fmtDateUTC(generatedAt)}</p>
        </div>
      </div>
    </aside>
  );
}

export default function App() {
  const { data, error, loading } = useData();
  const [state, setState] = useState<DashboardState>(() => parseState(window.location.search));
  const q = useDebounced(state.q, 200);

  useEffect(() => {
    const s = serializeState(state);
    window.history.replaceState(null, '', window.location.pathname + s + window.location.hash);
  }, [state]);

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
        if ((combinedTokens(m, state.metric) ?? 0) <= 0) return false;
      } else if (!state.hasUsage && !state.showAll) {
        if ((combinedTokens(m, state.metric) ?? 0) > 0) return false;
      }
      if (ql && !(m.name.toLowerCase().includes(ql) || m.key.toLowerCase().includes(ql) || m.labName.toLowerCase().includes(ql) || m.lab.toLowerCase().includes(ql))) return false;
      return true;
    });
  }, [data, q, state.lab, state.status, state.hasUsage, state.showAll, state.metric]);

  const sorted = useMemo(() => sortModels(filtered, state.sort, state.dir, state.metric), [filtered, state.sort, state.dir, state.metric]);

  const openModel = data?.models.find((m) => m.key === state.model) || null;

  const select = (key: string) => {
    setState((s) => ({ ...s, model: key }));
    window.history.pushState(null, '', window.location.pathname + serializeState({ ...state, model: key }));
  };

  void DEFAULT_STATE;

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-(--paper) text-(--ink)">
        {data && <Header generatedAt={data.generatedAt} windowEnd={data.window.end} ocUpdated={data.window.opencodeUpdatedAt} orAsOf={data.window.openrouterAsOf} />}
        <div className="mx-auto flex max-w-[1400px] gap-10 px-4 sm:px-6">
          {data && <Rail generatedAt={data.generatedAt} windowEnd={data.window.end} ocUpdated={data.window.opencodeUpdatedAt} orAsOf={data.window.openrouterAsOf} />}
          <main className="min-w-0 flex-1 space-y-8 py-6">
            {loading && (
              <div className="space-y-3" aria-label="Loading">
                {[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse bg-(--paper-deep)" />)}
              </div>
            )}
            {error && (
              <div className="border-l-2 border-(--neg) pl-4">
                <p className="font-medium">Data could not be loaded: {error.message}</p>
                <p className="mt-1 text-[13px] text-(--muted)">Check the <a className="underline" href="https://github.com/JasonXiao127/token-usage/actions">Actions tab</a> or <a className="underline" href="./data/usage.json">raw JSON</a>.</p>
                <button onClick={() => window.location.reload()} className="mt-3 border border-(--ink) px-4 py-1.5 text-[13px] hover:bg-(--ink) hover:text-(--paper)">Retry</button>
              </div>
            )}
            {data && (
              <>
                <StaleBanner generatedAt={data.generatedAt} />
                <Lede data={data} metric={state.metric} />
                <StatsStrip data={data} metric={state.metric} />
                <div id="overview" className="scroll-mt-6 space-y-8">
                  <MetricToggle value={state.metric} onChange={(metric) => patch({ metric, page: 1 })} />
                  <GlobalShare data={data} metric={state.metric} onSelect={select} />
                  <LabMix data={data} onLab={(lab) => patch({ lab, page: 1 })} />
                  <TopModels data={data} metric={state.metric} onSelect={select} />
                </div>
                <div id="models" className="scroll-mt-6 space-y-3">
                  <h2 className="text-[13px] font-semibold">All models</h2>
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
        </div>
        <div className="mx-auto max-w-[1400px] px-4 sm:px-6">
          <Footer />
        </div>
        <ModelDrawer model={openModel} metric={state.metric} onClose={() => { patch({ model: '' }); window.history.pushState(null, '', window.location.pathname + serializeState({ ...state, model: '' })); }} />
      </div>
    </ErrorBoundary>
  );
}
