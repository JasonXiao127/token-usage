# DESIGN.md — Token Usage, “Index” direction

A data publication, not a dashboard. One idea carries the page: a real left
margin for metadata, with the main column as a global ranking of model usage.

The two feeds (OpenCode, OpenRouter) are observation channels that add up to
one combined total — never opponents. The hero is a single global ranking by
combined token share; source identity appears only as provenance (thin
blue/amber “where observed” strips, rail links, methodology).

## Tokens

### Light
| Role | Value |
|---|---|
| paper | `#F1F2ED` |
| paper-deep (drawer, header wash) | `#E9EBE3` |
| ink | `#161B18` |
| soft ink | `#3D453F` |
| muted | `#586159` |
| rule | `#C9CFC7` |
| OpenCode (data blue) | `#1E4E8C` |
| OpenRouter (amber) | `#A55A1B` |
| positive | `#2F6B4F` |
| negative | `#A23B32` |

### Dark
| Role | Value |
|---|---|
| paper | `#141815` |
| paper-deep | `#1B201C` |
| ink (bone) | `#E8E6DD` |
| muted | `#A3A89E` |
| rule | `#2E342E` |
| OpenCode | `#8FB3D9` |
| OpenRouter | `#D8A468` |
| positive | `#7FB08E` |
| negative | `#D08A80` |

Lab dots use a muted scientific-atlas set (`src/lib/colors.ts`): slate,
moss, ochre, clay, steel, plum, sage, rust. Never a rainbow, never neon.

## Type

- Display: **IBM Plex Serif** 400/500 — masthead, lede, section titles.
- UI/body: **IBM Plex Sans** 400/500/600 — labels, table, controls.
- Numbers: **IBM Plex Mono** 400/500 — tokens, shares, dates, ids.
  Mono is for tabular data a reader scans, never decoration.

Scale: masthead 22/500 serif, lede 30/34/38 serif, section titles 15/600 sans,
body 14–15 sans, small labels 12 sans, numbers tabular everywhere.
Type utilities live in `src/index.css` (`.t-masthead`, `.t-hero`, `.t-stat`,
`.t-data`, `.t-label`, `.t-meta`, `.t-note`, `.t-input`): base is the wide-index
scale, with one discrete integer step at 2xl (≥1536px) — data 14→15,
hero 34→38. No `clamp()`, no fractional px, so mono numerals stay crisp.
Form controls use `.t-input` (16px on phones so iOS does not zoom on focus,
14px from sm).

Sentence case everywhere. No tracked all-caps eyebrows. No `A · B · C`
meta strings — metadata lives in the rail as label/value rows.

## Layout

- Max width 1720px. Rail 240px visible at ≥1440px only; below that the main
  column uses the full width. Gutters 24px, 32px at ≥1440. Main gaps 32px,
  40px at ≥1440. At 1440 the main is ~1088px; at 1720 it is ~1368px.
- The rail holds: window, sources, coverage (98.5% OC / 93.7% OR matched),
  contents (anchor nav), download, repo link. It is the only navigation chrome.
- Window control sits above the lede: label + 1 day / 7 days / 30 days tabs
  left, date range + “complete UTC days” right (wraps on phones).
- Top band and overview are two columns at ≥1200px (`1.55fr / 1fr`): lede +
  key-figures ledger, then global ranking + (lab mix, largest moves). Stacked
  below 1200; the stats strip replaces the ledger there.
- The ranking chart appears once (top 12). There is no second “Top models”
  list. Bars and where-observed strips share the same proportional width;
  a full-width strip is a bug.
- Key figures: 28px values, 12px labels; lede 30/34/38 with 30ch cap.
- Rules only where they encode structure: masthead base, stats strip
  dividers, section boundaries, table rows. No decorative hairlines.
- The table is the centrepiece: 7 columns (Observed dropped), 14px type,
  right-aligned numbers, sticky header, 50 rows default with a 25/50/100/250
  chooser, container-query cards below ~1000px. Model column max 300px.
  Combined tokens first. Provenance lives in the ranking strips, the lab
  legend, the rail links and methodology — never as a table bar contest.
- Charts sit directly on the paper with a section label and a caption.
  No card wrappers, no shadows, no glass.
- Drawer: 640px sidecar on paper with a 1px left rule, sticky header,
  26px serif name, 28px combined value, 220px chart, plain sections.

## Interaction

One rule everywhere: pointer cursor on every enabled button, flat
`paper-deep` wash on hover, 140ms color/opacity transition. No lift, scale,
shadow, rounded chip or accent bar. Focus-visible keeps the 2px `--oc`
outline. `prefers-reduced-motion` makes it instant. Applies to ranking rows,
movers rows, table rows/cards, lab legend chips, lab bar segments (opacity),
toolbar/pagination/Clear, header icon buttons, drawer links and close.

## Motion

Only motion that answers an action: drawer slide, row hover, focus ring,
tab underline. No page-load fade-ups, no count-ups, no scroll reveals.
`prefers-reduced-motion` disables the drawer slide.

## Explicitly banned

Purple/indigo gradients, teal/violet accents, cream `#F4F1EA`,
terracotta `#D97757`, acid green, glass blur, gradient text, `rounded-2xl`
card kit, soft grey shadows on everything, pill badges, one-word-accented
headlines, decorative 01/02/03, fake window dots, arrows welded to links,
Inter/Roboto/system-only/Space Grotesk/Geist/Instrument Serif/Fraunces.

## Rationale log

- The avoid-ai-design scanner reports P0 0 · P1 0 on `src/`. The four
  remaining P2 SD4d flags (`·` separators in StatsStrip, ModelTable rows,
  ModelDrawer key line, Header timestamp) are kept deliberately: each joins
  two or three parallel values of the same datum (OC/OR figures, lab ·
  modality, users · sessions) in a tabular context, not decorative
  `A · B · C` chrome. Exempt per catalog rule “keep a label only when it
  carries information the heading does not.”
- Mono numerals in stats/table (Vercel guidelines: tabular-nums for
  comparisons; mono only for scanned data, not labels).
- Blue/amber data colors mark source provenance only: the “where observed”
  strips, rail source links, and drawer source rows (avoid-ai-design C2/SD8:
  accent must have a job). The global numbers themselves — hero bars, table
  lead column, stats — are neutral ink, so the page never reads as a contest
  between the two feeds.
- Serif display + grotesque body is the publication signal; stone ground
  is cool (`#F1F2ED`), not parchment, and the accents are primary-data
  blue/amber, not clay — keeps clear of the SD1 cream/terracotta cluster.
- Single dark theme derived from the same tokens (graphite, not
  tinted `#111`), brass instead of neon (avoids SD2).
