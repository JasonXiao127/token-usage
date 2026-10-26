# DESIGN.md — Token Usage, “Index” direction

A data publication, not a dashboard. One idea carries the page: a real left
margin for metadata, with the main column acting as an index of models.

## Tokens

### Light
| Role | Value |
|---|---|
| paper | `#F1F2ED` |
| paper-deep (drawer, header wash) | `#E9EBE3` |
| ink | `#161B18` |
| soft ink | `#3D453F` |
| muted | `#5F6860` |
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

Scale: masthead 20/500 serif, lede 17–19 serif, section titles 13/600 sans,
body 13 sans, small labels 11–12 sans, numbers tabular everywhere.

Sentence case everywhere. No tracked all-caps eyebrows. No `A · B · C`
meta strings — metadata lives in the rail as label/value rows.

## Layout

- Max width 1400px. Desktop: 240px metadata rail + main column.
- The rail holds: window, sources, coverage, contents (anchor nav),
  download, repo link. It is the only navigation chrome.
- Rules only where they encode structure: masthead base, stats strip
  dividers, section boundaries, table rows. No decorative hairlines.
- The table is the centrepiece: full-bleed, sticky header, hairline rows,
  mono numerals, status as plain text (`both`, `OC only`, `OR only`),
  a thin index tick instead of a rounded share bar.
- Charts sit directly on the paper with a section label and a caption.
  No card wrappers, no shadows, no glass.
- Drawer: sidecar on paper with a 1px left rule, serif name, mono stats,
  plain sections. No nested cards.

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
- Blue/amber data colors tie to the two sources named in the rail
  (“OpenCode” blue, “OpenRouter” amber) — the one place color carries
  meaning (avoid-ai-design C2/SD8: accent must have a job).
- Serif display + grotesque body is the publication signal; stone ground
  is cool (`#F1F2ED`), not parchment, and the accents are primary-data
  blue/amber, not clay — keeps clear of the SD1 cream/terracotta cluster.
- Single dark theme derived from the same tokens (graphite, not
  tinted `#111`), brass instead of neon (avoids SD2).
