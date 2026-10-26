import { useEffect } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import type { Metric, ModelRow } from '../../shared/types';
import { fmtTokens, fmtShare, fmtPrice, fmtCtx, fmtFull } from '../lib/format';
import { StatusText } from './ModelTable';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-(--rule) pt-3">
      <h3 className="mb-1.5 text-[12px] font-semibold">{title}</h3>
      {children}
    </div>
  );
}

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
      <div className="tu-fade absolute inset-0 bg-black/35" onClick={onClose} />
      <aside className="tu-drawer tu-scroll absolute right-0 top-0 flex h-full w-full max-w-[560px] flex-col overflow-y-auto border-l border-(--rule) bg-(--paper)">
        <div className="flex items-start gap-3 border-b border-(--ink) p-5">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] text-(--muted)">{m.labName} · <StatusText status={m.status} /></p>
            <h2 className="font-display mt-0.5 text-[22px] font-medium leading-tight tracking-[-0.01em]">{m.name}</h2>
            <p className="num mt-1 text-[11px] text-(--muted)">{m.key}</p>
            <div className="mt-2 flex gap-4 text-[12px]">
              {m.meta.opencodePage && <a href={m.meta.opencodePage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-(--oc) underline-offset-2 hover:underline">OpenCode <ExternalLink size={11} /></a>}
              {m.meta.openrouterPage && <a href={m.meta.openrouterPage} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-(--or) underline-offset-2 hover:underline">OpenRouter <ExternalLink size={11} /></a>}
            </div>
          </div>
          <button onClick={onClose} aria-label="Close" className="p-1.5 hover:text-(--muted)"><X size={17} /></button>
        </div>

        <div className="space-y-4 p-5">
          {m.stale && <p className="border-l-2 border-(--or) pl-3 text-[12px] text-(--muted)">Detail data may be stale — the model page has not updated recently. Totals reflect the last successful fetch.</p>}
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2">
            <div><dt className="text-[11px] text-(--muted)">Combined observed tokens</dt><dd className="num text-[24px] font-medium">{fmtTokens(m.combined.tokens[metric])}</dd><dd className="num text-[11px] text-(--muted)">share {fmtShare(m.combined.share[metric])} of combined</dd></div>
          </dl>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2">
            <div><dt className="text-[11px] text-(--oc)">OpenCode</dt><dd className="num text-[20px] font-medium">{fmtTokens(m.opencode?.tokens[metric])}</dd><dd className="num text-[11px] text-(--muted)">share {fmtShare(m.opencode?.share[metric])} of OpenCode · 2-mo {fmtTokens(m.opencode?.twoMonthTokens)}</dd></div>
            <div><dt className="text-[11px] text-(--or)">OpenRouter · excl. BYOK</dt><dd className="num text-[20px] font-medium">{fmtTokens(m.openrouter?.tokens[metric])}</dd><dd className="num text-[11px] text-(--muted)">share {fmtShare(m.openrouter?.share[metric])} of OpenRouter</dd></div>
          </dl>
          {m.opencode && <p className="num text-[11px] text-(--muted)">users {m.opencode.uniqueUsers != null ? fmtFull(m.opencode.uniqueUsers) : '—'} · sessions {m.opencode.sessions != null ? fmtFull(m.opencode.sessions) : '—'}{m.openrouter ? ` · requests ${fmtFull(m.openrouter.requests[metric])}` : ''}</p>}

          {daily.length > 1 && (
            <Section title={`OpenCode daily tokens, last ${daily.length} days`}>
              <div className="h-[180px]">
                <ResponsiveContainer>
                  <AreaChart data={daily.map((d) => ({ ...d, label: d.date.slice(5) }))}>
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }} minTickGap={24} axisLine={{ stroke: 'var(--rule)' }} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }} tickFormatter={(v: number) => fmtTokens(v)} width={52} axisLine={false} tickLine={false} />
                    <Tooltip formatter={(v) => [fmtTokens(v as number), 'tokens']} labelFormatter={(l) => String(l)} contentStyle={{ background: 'var(--paper)', border: '1px solid var(--rule)', fontSize: 12 }} />
                    <Area type="monotone" dataKey="tokens" stroke="var(--oc)" fill="var(--oc)" fillOpacity={0.12} strokeWidth={1.5} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </Section>
          )}

          <Section title="Facts">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-1 text-[12px]">
              <dt className="text-(--muted)">Context</dt><dd className="num text-right">{fmtCtx(m.meta.contextTokens)}</dd>
              <dt className="text-(--muted)">Max output</dt><dd className="num text-right">{fmtCtx(m.meta.outputTokens)}</dd>
              <dt className="text-(--muted)">Released</dt><dd className="text-right">{m.meta.releaseDate || '—'}</dd>
              <dt className="text-(--muted)">Knowledge</dt><dd className="text-right">{m.meta.knowledgeCutoff || '—'}</dd>
              <dt className="text-(--muted)">Reasoning</dt><dd className="text-right">{m.meta.reasoning == null ? '—' : m.meta.reasoning ? 'yes' : 'no'}</dd>
              <dt className="text-(--muted)">Open weights</dt><dd className="text-right">{m.meta.openWeights == null ? '—' : m.meta.openWeights ? 'yes' : 'no'}</dd>
            </dl>
          </Section>

          <Section title="Price per 1M tokens">
            <div className="num grid grid-cols-3 gap-2 text-[12px]">
              <span className="text-(--muted)">Input<br /><b className="font-medium text-(--ink)">OC {fmtPrice(m.meta.pricing?.input)}<br />OR {fmtPrice(m.meta.orPricing?.input)}</b></span>
              <span className="text-(--muted)">Output<br /><b className="font-medium text-(--ink)">OC {fmtPrice(m.meta.pricing?.output)}<br />OR {fmtPrice(m.meta.orPricing?.output)}</b></span>
              <span className="text-(--muted)">Cached<br /><b className="font-medium text-(--ink)">OC {fmtPrice(m.meta.pricing?.cachedInput)}<br />OR {fmtPrice(m.meta.orPricing?.cachedInput)}</b></span>
            </div>
          </Section>

          {(m.opencode?.variants?.length ?? 0) > 1 && (
            <Section title={`OpenCode variants (${m.opencode!.variants.length})`}>
              <ul className="divide-y divide-(--rule) text-[12px]">
                {m.opencode!.variants.map((v) => (
                  <li key={v.id} className="flex justify-between gap-2 py-1">
                    <a href={v.pageUrl} target="_blank" rel="noreferrer" className="truncate text-(--oc) underline-offset-2 hover:underline">{v.name}</a>
                    <span className="num shrink-0">{fmtTokens(v.tokens.week)} / 7d</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          {(m.openrouter?.variants?.length ?? 0) > 0 && (
            <Section title={`OpenRouter variants (${m.openrouter!.variants.length})`}>
              <ul className="divide-y divide-(--rule) text-[12px]">
                {m.openrouter!.variants.slice().sort((a, b) => (b.tokens.week ?? 0) - (a.tokens.week ?? 0)).slice(0, 12).map((v) => (
                  <li key={v.permaslug + v.variant} className="flex justify-between gap-2 py-1">
                    <span className="truncate">{v.permaslug} <span className="text-(--muted)">· {v.variant}</span></span>
                    <span className="num shrink-0">{fmtTokens(v.tokens.week)} / 7d</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
}
