# Token Usage — global model usage from OpenCode + OpenRouter

Unofficial index of per-model token usage combining [OpenCode Data](https://opencode.ai/data/) and [OpenRouter rankings](https://openrouter.ai/rankings). Refreshed every 6 hours via GitHub Actions, hosted on GitHub Pages.

Live: **https://jasonxiao127.github.io/token-usage/**

## What it answers

- Which models people are picking: one global ranking by combined observed tokens (OpenCode + OpenRouter).
- How much each source contributes, and where each model's usage was observed (provenance strips, not a contest).
- Per-model trends, variants, pricing, context, and source links.

## Data pipeline

`npm run collect` (TypeScript, no API keys):

1. OpenCode `index.json` + sitemap → ~75 lab JSON files (catalog metadata, JSON-only: no HTML scraping).
2. Leaderboard + model detail JSON for catalog models with >1M two-month tokens (daily series, pricing, users, sessions). Top hidden models resolve via leaderboard/detail pages; uncovered long-tail hidden rows are omitted by design.
3. OpenRouter `/api/v1/models` + public rankings endpoint (`view=day|week|month`, `tokens_excl_byok`). Note: the compliant long-term path is the official Data API (requires `OPENROUTER_API_KEY`); the frontend endpoint is kept for its breakdown fields.
4. Normalize/match (provider aliases, date-aware versions, contributor grouping, explicit alias map), compute combined observed tokens (OpenCode + OpenRouter) and UTC windows on complete days, validate, write `public/data/usage.json` + `reports/match-report.md`.
5. Archive one immutable day file to `public/data/history/YYYY/MM/YYYY-MM-DD.json` (never overwritten or deleted), backfill OpenCode ~56 days from detail pages, rebuild `public/data/history/index.json`. `npm run history:verify` validates files, index, and size guards.

Combined observed tokens are a public-data index, not audited global spend: the two feeds are separate populations that may overlap (OpenCode can route through OpenRouter), so no dedupe is possible.

Validation gates: ≥60 labs, ≥400 catalog models, ≥400 OpenRouter models, window end within 4 days, OpenRouter coverage ≥50% (warn <80%), history <500MB (warn >200MB). Failure exits non-zero and the deploy job never runs — the last good site stays live.

## History

- One compact JSON file per UTC day under `public/data/history/` + `index.json`. OpenCode backfilled ~56 days; OpenRouter history starts at the first archive run (the frontend endpoint has no backfill).
- Each file stores sources, asOf dates, citations, totals, match coverage, and per-model OC tokens/users/sessions/cost + OR tokens/requests/prompt/completion/BYOK with native ids/permaslugs, prices, and combined tokens. Files are immutable; consumers can rely on them permanently.
- Storage: ~40–50MB/year raw (~6MB/year compressed). Warn at 200MB, fail at 500MB. If the budget is ever approached, move older years to GitHub Releases. See `public/data/history/README.md` for the schema.

## Develop

```bash
npm install
npm run collect         # fetch live data into public/data/usage.json + history
npm run history:verify  # validate public/data/history files + index + size
npm run dev             # vite dev server
npm run build           # BASE_PATH=/token-usage/ npm run build for Pages subpath
npm test -- --run       # vitest
```

## Deploy

Push to `main` runs collect → history:verify → typecheck → tests → build → GitHub Pages. Schedule `23 */6 * * *` UTC refreshes data. A daily history commit (`public/data/history`, `[skip ci]`) keeps scheduled workflows active and preserves the archive.

## Attribution

- OpenCode Data (opencode.ai/data), updated hourly.
- OpenRouter rankings (openrouter.ai/rankings), "Source: OpenRouter (openrouter.ai/rankings), as of {date}", CC BY 4.0.
- Code: MIT. Unofficial project, not affiliated with either source.
