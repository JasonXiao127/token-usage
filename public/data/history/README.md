# Daily history

One immutable JSON file per UTC day. Files are never overwritten or deleted.

- Combined day: `YYYY/MM/YYYY-MM-DD.json` (both sources cover the same UTC day).
- Source-only days (dates differ, no mislabeling): `YYYY-MM-DD.oc.json`, `YYYY-MM-DD.or.json`.
- `index.json`: sorted list of days with file paths, sources, totals, and model counts.
- OpenCode backfilled ~56 days from model detail pages (marked `partial: true`).
  OpenRouter history starts at the first archive run (the rankings endpoint has no backfill).

## Schema (v1)

Each day file:

- `date`: primary UTC date. `ocDate`/`orDate`: source coverage dates.
- `partial`: true for source-only or backfilled files.
- `sources`: OpenCode citation + `asOf`; OpenRouter CC BY 4.0 + `asOf`.
- `totals`: per-source day totals + combined (sum of available sides).
- `match`: day-based matched/only counts and coverage.
- `models`: only models with usage that day. `oc`: tokens/users/sessions/costUsd + variant `ids`.
  `or`: tokens/requests/prompt/completion/byok + variant `permaslugs`.
  `combined` = oc + or (whichever sides exist). Prices prefer OpenCode, else OpenRouter.

## Consumption

- `index.json` gives daily totals for charts without reading every file.
- Per-model series: read each day file, key by `key` (stable group id).
- Native refs: `oc.ids` are OpenCode model ids, `or.permas` are OpenRouter permaslugs.

## Storage

~40–50MB/year raw (~6MB/year compressed). Warn at 200MB, fail at 500MB
(see `npm run history:verify`). If the budget is ever approached, move older
years to GitHub Releases and link them here.
