import { useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, Tooltip, ReferenceLine, ResponsiveContainer, Cell } from 'recharts';
import type { DataFile, Metric } from '../../shared/types';
import { labColor } from '../lib/colors';
import { fmtShare, fmtTokens } from '../lib/format';

export default function ShareScatter({ data, metric, onSelect }: { data: DataFile; metric: Metric; onSelect: (key: string) => void }) {
  const points = useMemo(() => {
    return data.models
      .filter((m) => (m.opencode?.share[metric] ?? 0) > 0 && (m.openrouter?.share[metric] ?? 0) > 0)
      .map((m) => ({
        key: m.key,
        name: m.name,
        lab: m.labName,
        x: m.opencode!.share[metric]!,
        y: m.openrouter!.share[metric]!,
        oc: m.opencode!.tokens[metric]!,
        or: m.openrouter!.tokens[metric]!,
        color: labColor(m.lab),
        size: Math.sqrt((m.opencode!.tokens[metric]! + m.openrouter!.tokens[metric]!)) / 1e6,
      }))
      .sort((a, b) => b.oc + b.or - (a.oc + a.or))
      .slice(0, 250);
  }, [data, metric]);

  if (!points.length) return <div className="p-6 text-sm text-neutral-500">No matched models for this window.</div>;

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      <div className="mb-1 flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">OpenCode share vs OpenRouter share</h2>
        <span className="text-[11px] text-neutral-500">log scale · click a point for details</span>
      </div>
      <p className="mb-2 text-[11px] text-neutral-500 dark:text-neutral-400">Above the line = relatively more used on OpenRouter. Below = more used on OpenCode.</p>
      <div className="h-[340px]" role="img" aria-label={`Scatter of ${points.length} matched models by token share`}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
            <XAxis type="number" dataKey="x" scale="log" domain={['auto', 'auto']} tickFormatter={(v: number) => fmtShare(v)} tick={{ fontSize: 11 }} name="OpenCode share" />
            <YAxis type="number" dataKey="y" scale="log" domain={['auto', 'auto']} tickFormatter={(v: number) => fmtShare(v)} tick={{ fontSize: 11 }} name="OpenRouter share" />
            <ZAxis type="number" dataKey="size" range={[24, 320]} />
            <Tooltip
              cursor={{ strokeDasharray: '3 3' }}
              content={(props: unknown) => {
                const p = (props as { active?: boolean; payload?: Array<{ payload: { name: string; lab: string; oc: number; or: number; x: number; y: number } }> }).payload?.[0]?.payload;
                const active = (props as { active?: boolean }).active;
                if (!active || !p) return null;
                return (
                  <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-xs shadow-lg dark:border-neutral-700 dark:bg-neutral-800">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-neutral-500">{p.lab}</div>
                    <div className="num mt-1">OC {fmtTokens(p.oc)} ({fmtShare(p.x)})</div>
                    <div className="num">OR {fmtTokens(p.or)} ({fmtShare(p.y)})</div>
                  </div>
                );
              }}
            />
            <ReferenceLine segment={[{ x: 0.001, y: 0.001 }, { x: 100, y: 100 }]} stroke="#94a3b8" strokeDasharray="4 4" />
            <Scatter data={points} onClick={(d: unknown) => { const k = (d as { key?: string } | undefined)?.key; if (k) onSelect(k); }}>
              {points.map((p) => <Cell key={p.key} fill={p.color} fillOpacity={0.75} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
