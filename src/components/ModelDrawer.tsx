import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Metric, ModelRow } from '../../shared/types';
import { fmtTokens, fmtShare, fmtPrice, fmtCtx, fmtFull } from '../lib/format';
import { StatusBadge } from './ModelTable';

export default function ModelDrawer({ model, metric, onClose }: { model: ModelRow | null; metric: Metric; onClose: () => void }) {
  useEffect(() => {
    if (!model) return;
    const fn = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [model, onClose]);

  if (!model) return null;
  const m = model;
  const daily = (m.opencode?.daily || []).slice(-60);
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={`${m.name} details`}>
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <aside className="tu-scroll absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-neutral-200 bg-white dark:border-neutral-800 dark:bg-neutral-950">
        <div className="sticky top-0 flex items-start gap-3 border-b border-neutral-200 bg-white/95 p-4 backdrop-blur dark:border-neutral-800 dark:bg-neutral-950/95">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h2 className="truncate text-lg font-semibold text-neutral-900 dark:text-neutral-50">{m.name}</h2>
              <StatusBadge status={m.status} />
            </div>
            <div className="text-xs text-neutral-500">{m.labName} · {m.key}</div>
            <div className="mt-1 flex gap-3 text-xs">
              {m.meta.opencodePage && <a href={m.meta.opencodePage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-teal-600 hover:underline">OpenCode <ExternalLink size={11} /></a>}
              {m.meta.openrouterPage && <a href={m.meta.openrouterPage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-violet-600 hover:underline">OpenRouter <ExternalLink size={11} /></a>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg border border-neutral-200 p-2 dark:border-neutral-700"><X size={16} /></button>
        </div>

        <div className="space-y-4 p-4">
          {m.stale && <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 dark:bg-amber-900/20 dark:text-amber-200">Detail data may be stale — the model page hasn't updated recently. Totals below reflect the last successful fetch.</div>}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="text-[11px] font-medium text-teal-700 dark:text-teal-300">OpenCode</div>
              <div className="num text-lg font-semibold">{fmtTokens(m.opencode?.tokens[metric])}</div>
              <div className="num text-[11px] text-neutral-500">share {fmtShare(m.opencode?.share[metric])} · 2mo {fmtTokens(m.opencode?.twoMonthTokens)}</div>
              {m.opencode && <div className="mt-1 text-[11px] text-neutral-500">users {m.opencode.uniqueUsers != null ? fmtFull(m.opencode.uniqueUsers) : '—'} · sessions {m.opencode.sessions != null ? fmtFull(m.opencode.sessions) : '—'}</div>}
            </div>
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="text-[11px] font-medium text-violet-700 dark:text-violet-300">OpenRouter · excl. BYOK</div>
              <div className="num text-lg font-semibold">{fmtTokens(m.openrouter?.tokens[metric])}</div>
              <div className="num text-[11px] text-neutral-500">share {fmtShare(m.openrouter?.share[metric])}</div>
              {m.openrouter && <div className="mt-1 text-[11px] text-neutral-500">requests {fmtFull(m.openrouter.requests[metric])}</div>}
            </div>
          </div>

          {daily.length > 1 && (
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="mb-1 text-xs font-medium text-neutral-600 dark:text-neutral-300">OpenCode daily tokens (last {daily.length} days)</div>
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <AreaChart data={daily.map((d) => ({ ...d, label: d.date.slice(5) }))}>
                    <XAxis dataKey="label" tick={{ fontSize: 10 }} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10 }} tickFormatter={(v: number) => fmtTokens(v)} width={52} />
                    <Tooltip formatter={(v) => [fmtTokens(v as number), 'tokens']} labelFormatter={(l) => String(l)} />
                    <Area type="monotone" dataKey="tokens" stroke="#0d9488" fill="#0d9488" fillOpacity={0.18} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-1 text-xs font-medium">Facts</div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
              <dt className="text-neutral-500">Context</dt><dd className="num text-right">{fmtCtx(m.meta.contextTokens)}</dd>
              <dt className="text-neutral-500">Max output</dt><dd className="num text-right">{fmtCtx(m.meta.outputTokens)}</dd>
              <dt className="text-neutral-500">Released</dt><dd className="text-right">{m.meta.releaseDate || '—'}</dd>
              <dt className="text-neutral-500">Knowledge</dt><dd className="text-right">{m.meta.knowledgeCutoff || '—'}</dd>
              <dt className="text-neutral-500">Reasoning</dt><dd className="text-right">{m.meta.reasoning == null ? '—' : m.meta.reasoning ? 'yes' : 'no'}</dd>
              <dt className="text-neutral-500">Open weights</dt><dd className="text-right">{m.meta.openWeights == null ? '—' : m.meta.openWeights ? 'yes' : 'no'}</dd>
            </dl>
          </div>

          <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
            <div className="mb-1 text-xs font-medium">Price per 1M tokens</div>
            <div className="num grid grid-cols-3 gap-2 text-xs">
              <span className="text-neutral-500">Input<br /><b className="text-neutral-900 dark:text-neutral-100">OC {fmtPrice(m.meta.pricing?.input)}<br />OR {fmtPrice(m.meta.orPricing?.input)}</b></span>
              <span className="text-neutral-500">Output<br /><b className="text-neutral-900 dark:text-neutral-100">OC {fmtPrice(m.meta.pricing?.output)}<br />OR {fmtPrice(m.meta.orPricing?.output)}</b></span>
              <span className="text-neutral-500">Cached<br /><b className="text-neutral-900 dark:text-neutral-100">OC {fmtPrice(m.meta.pricing?.cachedInput)}<br />OR {fmtPrice(m.meta.orPricing?.cachedInput)}</b></span>
            </div>
          </div>

          {(m.opencode?.variants?.length ?? 0) > 1 && (
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="mb-1 text-xs font-medium">OpenCode variants ({m.opencode!.variants.length})</div>
              <ul className="space-y-1 text-xs">
                {m.opencode!.variants.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2">
                    <a href={v.pageUrl} target="_blank" rel="noreferrer" className="truncate text-teal-600 hover:underline">{v.name}</a>
                    <span className="num shrink-0">{fmtTokens(v.tokens.week)} / 7d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(m.openrouter?.variants?.length ?? 0) > 0 && (
            <div className="rounded-xl border border-neutral-200 p-3 dark:border-neutral-800">
              <div className="mb-1 text-xs font-medium">OpenRouter variants ({m.openrouter!.variants.length})</div>
              <ul className="space-y-1 text-xs">
                {m.openrouter!.variants.slice().sort((a, b) => (b.tokens.week ?? 0) - (a.tokens.week ?? 0)).slice(0, 12).map((v) => (
                  <li key={v.permaslug + v.variant} className="flex justify-between gap-2">
                    <span className="truncate">{v.permaslug} <span className="text-neutral-400">· {v.variant}</span></span>
                    <span className="num shrink-0">{fmtTokens(v.tokens.week)} / 7d</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
