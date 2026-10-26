# Token Usage — OpenCode × OpenRouter

Unofficial dashboard of per-model token usage across [OpenCode Data](https://opencode.ai/data/) and [OpenRouter rankings](https://openrouter.ai/rankings). Refreshed every 6 hours via GitHub Actions, hosted on GitHub Pages.

Live: **https://jasonxiao127.github.io/token-usage/**

## What it answers

- Which models dominate **OpenCode** vs **OpenRouter** (shares are per-ecosystem — never added together).
- Which models over-index on one side (index ratio + log-scale scatter).
- Per-model trends, variants, pricing, context, and source links.

## Data pipeline

`npm run collect` (TypeScript, no API keys):

1. OpenCode `index.json` + sitemap → ~75 lab JSON files (catalog metadata).
2. Lab HTML usage arrays — authoritative per-model 2-month totals (lab JSON alone misses Meta/NVIDIA/Google hidden models like `muse-spark-1.3-contributor`, `nemotron-3-ultra`).
3. Model detail JSON for ~60 usage-heavy models (daily series, pricing, users, sessions).
4. OpenRouter `/api/v1/models` + public rankings endpoint (`view=day|week|month`, `tokens_excl_byok`).
5. Normalize/match (provider aliases, date-aware versions, contributor grouping, explicit alias map), compute UTC windows on complete days, validate, write `public/data/usage.json` + `reports/match-report.md`.

Validation gates: ≥60 labs, ≥400 catalog models, ≥400 OpenRouter models, lab sums within 0.1%, window end within 4 days, OpenRouter coverage ≥50% (warn <80%). Failure exits non-zero and the deploy job never runs — the last good site stays live.

## Develop

```bash
npm install
npm run collect   # fetch live data into public/data/usage.json
npm run dev       # vite dev server
npm run build     # BASE_PATH=/token-usage/ npm run build for Pages subpath
npm test -- --run # vitest
```

## Deploy

Push to `main` runs collect → typecheck → tests → build → GitHub Pages. Schedule `23 */6 * * *` UTC refreshes data. A daily heartbeat commit keeps scheduled workflows from being disabled after 60 days of inactivity.

## Attribution

- OpenCode Data (opencode.ai/data), updated hourly.
- OpenRouter rankings (openrouter.ai/rankings), "Source: OpenRouter (openrouter.ai/rankings), as of {date}", CC BY 4.0.
- Code: MIT. Unofficial project, not affiliated with either source.
