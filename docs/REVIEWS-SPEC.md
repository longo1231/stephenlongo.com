# Annual Reviews — Spec

*The `/reviews` section: one "matrix" per year, plotting life activities on an
outcome × focus chart. Repo-only data, no Notion sync.*

## What it is

Each year, Stephen plots his activities on a 2D scatter: **x = outcome** (how well it went,
−10…10) and **y = change in focus** (whether it earns more or less attention next year,
−10…10). The four quadrants read as:

- **Top right** (green) — successful, getting more focus
- **Top left** (blue) — challenging, worth improving
- **Bottom left** (red) — challenging, to reduce
- **Bottom right** (orange) — successful, naturally decreasing

## Structure

- [src/pages/reviews.astro](../src/pages/reviews.astro) — the index. A hardcoded `reviews`
  array (year, title, desc, href) rendered as a list. Add a new year by adding an entry here.
- [src/pages/reviews/2024-matrix.astro](../src/pages/reviews/2024-matrix.astro),
  [`2025-matrix.astro`](../src/pages/reviews/2025-matrix.astro) — one page per year. Each holds
  the `activities` array and passes it, plus `year` / `xLabel` / `yLabel`, to `<MatrixReview>`.
- [src/components/MatrixReview.astro](../src/components/MatrixReview.astro) — the shared chart.
  Renders the scatter, quadrant tints, per-point labels, and the legend.

## Adding a year

1. Duplicate `reviews/2025-matrix.astro` → `reviews/2026-matrix.astro`.
2. Replace the `activities` array. Each point is `{ label, x, y, labelOffset? }`; `x` is
   outcome, `y` is change in focus, both −10…10. `labelOffset` nudges the text label off the
   dot to avoid overlap (in canvas pixels; default `{ x: 0, y: -15 }`) — set these by eye
   after previewing.
3. Set `year`, and `xLabel` / `yLabel` (currently "Outcome" / "Change in Focus").
4. Add an entry to the `reviews` array in `reviews.astro`.

## Data model

`Activity = { label: string; x: number; y: number; labelOffset?: { x, y } }`.

The data lives **in the page files, not `books.json` or Notion** — it's authored by hand once
a year and never synced. Editing these files directly is expected and safe.

## Known dependency

`MatrixReview` loads **Chart.js 4 from a CDN** (`cdn.jsdelivr.net`) via an inline script tag.
This is the one place the site pulls a runtime asset from an external host — everything else is
self-contained (see the "no external hosts" invariant in [CLAUDE.md](../CLAUDE.md)). If that
inconsistency ever matters, vendor Chart.js into `public/` or the build instead. Left as-is
for now because it's a low-traffic page and Chart.js is heavy to self-host.
