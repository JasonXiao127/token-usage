import type { DataFile } from '../../shared/types';
import { fmtTokens } from '../lib/format';

export default function Methodology({ data }: { data: DataFile }) {
  const m = data.match;
  const total = data.totals.combined.week ?? 0;
  const oc = data.totals.opencode.week ?? 0;
  const or = data.totals.openrouter.week ?? 0;
  return (
    <section id="methodology" aria-label="Methodology" className="border-t border-(--ink) pt-3">
      <h2 className="text-[15px] font-semibold">Methodology</h2>
      <div className="t-note mt-2 grid gap-6 leading-[1.6] text-(--ink-soft) md:grid-cols-2 min-[1600px]:grid-cols-3">
        <div>
          <h3 className="t-meta font-semibold text-(--ink)">Combined total</h3>
          <p className="mt-1">
            Combined observed tokens = OpenCode tokens + OpenRouter tokens for the same window
            ({fmtTokens(oc)} + {fmtTokens(or)} = {fmtTokens(total)} for the 7-day window ending {data.window.end}).
            Models are ranked by share of that combined total — that ranking is what this page means by “what models people are picking.”
          </p>
          <p className="mt-1">
            The two feeds are observation channels, not audited global spend. OpenCode can route requests through OpenRouter,
            so the datasets may overlap and summing them can double-count some traffic. There is no way to dedupe that from public data,
            so treat the total as an observed index, not an invoice.
          </p>
          <h3 className="t-meta mt-3 font-semibold text-(--ink)">Windows</h3>
          <p className="mt-1">Complete UTC days ending {data.window.end}: 1d is {data.window.day}, 7d is {data.window.weekStart} – {data.window.end}, 30d is {data.window.monthStart} – {data.window.end}. The partial current day is excluded so both sources line up.</p>
        </div>
        <div>
          <h3 className="t-meta font-semibold text-(--ink)">Sources</h3>
          <ul className="mt-1 list-disc pl-5">
            <li>OpenCode: <a className="text-(--oc) underline-offset-2 hover:underline" href="https://opencode.ai/data/">opencode.ai/data</a> — hourly index, lab pages, model detail JSON. Updated {data.window.opencodeUpdatedAt}.</li>
            <li>OpenRouter: <a className="text-(--or) underline-offset-2 hover:underline" href="https://openrouter.ai/rankings">openrouter.ai/rankings</a> public rankings endpoint (day/week/month, excl. BYOK). Through {data.window.openrouterAsOf}.</li>
            <li>Model catalog and prices from OpenRouter <span className="num">/api/v1/models</span>.</li>
          </ul>
          <h3 className="t-meta mt-3 font-semibold text-(--ink)">Matching</h3>
          <p className="mt-1">{m.matchedGroups} matched groups · {m.opencodeOnlyGroups} OpenCode-only · {m.openrouterOnlyModels} OpenRouter-only. OpenRouter token coverage {m.openrouterTokenCoverage.week?.toFixed(1)}% (7d). OpenCode coverage {m.opencodeTokenCoverage.week?.toFixed(1)}%.</p>
          <p className="mt-1">Provider aliases (z-ai → zhipuai, qwen → alibaba, …), date-aware version matching, contributor/variant grouping, and an explicit alias map. Unmatched usage stays visible as single-source rows.</p>
        </div>
        <div className="md:col-span-2 min-[1600px]:col-span-1">
          <h3 className="t-meta font-semibold text-(--ink)">Caveats</h3>
          <ul className="mt-1 list-disc pl-5">
            <li>Tokenizers differ by provider — counts are not directly comparable across models.</li>
            <li>OpenRouter excludes BYOK traffic; OpenCode includes cached and reasoning tokens.</li>
            <li>Combined 7d change is derived from both sources&apos; reported changes and stays blank when either side is unknown.</li>
          </ul>
        </div>
      </div>
      {(m.warnings.length > 0 || m.unmatchedTop.length > 0) && (
        <details className="t-meta mt-3 text-(--muted)">
          <summary className="cursor-pointer">Collector notes ({m.warnings.length} warnings · top unmatched)</summary>
          <ul className="mt-1 list-disc pl-5">
            {m.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
            {m.unmatchedTop.slice(0, 8).map((u) => <li key={u.name}>{u.name}: {fmtTokens(u.tokensWeek)} — {u.reason}</li>)}
          </ul>
        </details>
      )}
    </section>
  );
}
