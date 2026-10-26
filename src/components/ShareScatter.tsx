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
        size: Math.sqrt(m.opencode!.tokens[metric]! + m.openrouter!.tokens[metric]!) / 1e6,
      }))
      .sort((a, b) => b.oc + b.or - (a.oc + a.or))
      .slice(0, 250);
  }, [data, metric]);

  if (!points.length) return <p className="py-6 text-[13px] text-(--muted)">No matched models for this window.</p>;

  return (
    <section aria-label="OpenCode share versus OpenRouter share">
      <h2 className="text-[13px] font-semibold">OpenCode share against OpenRouter share</h2>
      <p className="mt-0.5 text-[12px] text-(--muted)">
        Log scale. Above the line reads relatively stronger on OpenRouter; below, on OpenCode. Select a point for the model.
      </p>
      <div className="mt-2 h-[340px]" role="img" aria-label={`Scatter of ${points.length} matched models by token share`}>
        <ResponsiveContainer>
          <ScatterChart margin={{ top: 12, right: 24, bottom: 8, left: 8 }}>
            <XAxis
              type="number" dataKey="x" scale="log" domain={['auto', 'auto']}
              tickFormatter={(v: number) => fmtShare(v)} tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              name="OpenCode share" axisLine={{ stroke: 'var(--rule)' }} tickLine={false} minTickGap={32}
            />
            <YAxis
              type="number" dataKey="y" scale="log" domain={['auto', 'auto']}
              tickFormatter={(v: number) => fmtShare(v)} tick={{ fontSize: 11, fill: 'var(--muted)', fontFamily: 'var(--font-mono)' }}
              name="OpenRouter share" axisLine={{ stroke: 'var(--rule)' }} tickLine={false} width={56}
            />
            <ZAxis type="number" dataKey="size" range={[20, 260]} />
            <Tooltip
              cursor={{ stroke: 'var(--rule)', strokeDasharray: '3 3' }}
              content={(props: unknown) => {
                const p = (props as { active?: boolean; payload?: Array<{ payload: { name: string; lab: string; oc: number; or: number; x: number; y: number } }> }).payload?.[0]?.payload;
                const active = (props as { active?: boolean }).active;
                if (!active || !p) return null;
                return (
                  <div className="border border-(--rule) bg-(--paper) px-3 py-2 text-xs shadow-none">
                    <div className="font-semibold">{p.name}</div>
                    <div className="text-(--muted)">{p.lab}</div>
                    <div className="num mt-1">OC {fmtTokens(p.oc)} ({fmtShare(p.x)})</div>
                    <div className="num">OR {fmtTokens(p.or)} ({fmtShare(p.y)})</div>
                  </div>
                );
              }}
            />
            <ReferenceLine segment={[{ x: 0.001, y: 0.001 }, { x: 100, y: 100 }]} stroke="var(--muted)" strokeDasharray="3 4" />
            <Scatter data={points} onClick={(d: unknown) => { const k = (d as { key?: string } | undefined)?.key; if (k) onSelect(k); }}>
              {points.map((p) => <Cell key={p.key} fill={p.color} fillOpacity={0.8} />)}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
