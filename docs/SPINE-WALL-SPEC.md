# Spine Wall — Spec

*July 2026. A second way to view the Bookshelf: all 307 books as spines on one long shelf.
Additive feature, one page touched, designed to be reverted in one line.*

## Goal

The cover grid stays exactly as it is. The Spine Wall is an alternate **view** of the same
data: every book rendered as a spine, shelved side by side, scrolling horizontally. Width
encodes page count, five-stars lean out, and clicking a spine pulls the book off the shelf
to reveal the actual cover — the payoff Stephen likes most about the current grid.

## View toggle

- Two new chips at the left of the existing filter row, visually separated from filters:
  `COVERS` / `SPINES`. This is a *view* switch, not a filter — filters apply in both views.
- **Default view: COVERS.** Casual visitors see zero change; the Spine Wall is opt-in.
- Choice persists in `localStorage` so returning visitors land on their preferred view.

## The shelf

- Server-rendered in Astro from `books.json` — no client-side data fetch, no new deps.
- One horizontal strip, `overflow-x: auto`, spines bottom-aligned on a 3px shelf line.
  A mono `SCROLL →` hint sits above it (same pattern as the matrix chart's swipe hint).
- Order: same as the grid (date read, newest first) so the two views feel like one shelf.
- Each spine:
  - **Width** = page count mapped to 14–44px (clamped). Books with `pages: null`
    (currently 63 of 307) use the median page count — invisible fallback.
  - **Height** = 170–230px, jittered deterministically from the title hash so the shelf
    looks organic but never changes between builds.
  - **Color** = the existing `hue(title)` tint, same gradient family as the placeholder
    jackets in the grid. The two views share a visual language for free.
  - **Title** runs vertically down the spine (`writing-mode: vertical-rl`), serif italic,
    truncated with ellipsis on tall titles.
- **Five-star books lean** out of the row (−4°/−6°, alternating) and get a 3px accent-orange
  top edge. This is the entire "recommended" layer — no badges, no extra UI.
- Legend line under the shelf, mono: `WIDTH = PAGE COUNT · LEANING SPINES = FIVE STARS`.

## Interactions

- **Hover (desktop):** spine pops up ~14px; a mono detail line under the shelf updates:
  `TITLE — AUTHOR · 464 PAGES · ★★★★☆`. No tooltip chrome.
- **Click / tap (all devices): pull-and-flip.** The spine slides up out of the row and the
  book "turns to face you": a jacket panel opens anchored above/near the spine showing
  - the **real cover** when `cover` is set (86 books today), else the tinted typographic
    jacket already used in the grid — same component styling, so the mixed shelf looks
    intentional;
  - rating stars, takeaway or tagline in quotes, `Recommended` tag, author · year —
    identical content to the grid overlay.
  - Implementation note: the "flip" is a CSS `scaleX` illusion (edge → face), not real 3D.
    One panel element reused for whichever book is open; covers get `loading="lazy"` and
    only ever load on first open, so the spines view adds no image weight.
- **Close:** click away, Esc, or click the same spine again. One book open at a time
  (same convention as the grid's mobile tap-to-reveal).
- **Filters:** the existing chips (`All / ★★★★★ / Recommended / types`) work in spines view,
  but non-matching spines **dim to ~12% opacity instead of hiding**, so the shelf keeps its
  shape and the density of matches reads at a glance.

## Accessibility

- Every spine is a `<button>` with `aria-label="{title} by {author}, {pages} pages, {rating} stars"`.
- Keyboard: Tab walks the shelf, Enter/Space opens the flip, Esc closes. The detail line is
  `aria-live="polite"`.
- `prefers-reduced-motion`: pop/flip animations collapse to instant state changes.

## Files touched (the whole footprint)

| File | Change |
|---|---|
| `src/components/SpineWall.astro` | **New.** Markup, scoped styles, inline script for the shelf. |
| `src/pages/bookshelf.astro` | Feature flag const, view-toggle chips, conditional `<SpineWall books={books} />`, ~10 lines in the existing script for view switching. |

Nothing else. No new dependencies, no config changes, no changes to the Notion sync or the
deploy workflow. Critically: the nightly sync only commits `src/data`, `src/content`, and
`public/covers` — zero overlap with the files above.

## Rollback plan

Two layers, softest first. Both were chosen because the nightly Notion-sync bot keeps
committing to `main`, which makes "just reset to a checkpoint" quietly dangerous (it would
delete any book data synced after the checkpoint).

### Layer 1 — kill switch (the "95% there but I don't love it" case)

`src/pages/bookshelf.astro` frontmatter starts with:

```js
const SPINE_WALL = true; // set false to fully hide the spines view
```

When `false`, the toggle chips are not rendered and the SpineWall component is not emitted —
the built page is byte-for-byte today's page. Reverting is a one-character edit, commit,
push; the Pages action redeploys in ~1 minute. The code stays in the repo for later tinkering.

### Layer 2 — clean removal (the "rip it out" case)

- Build on branch `spine-wall`; verify locally; **squash-merge to `main` as a single commit**
  titled `Add Spine Wall view to bookshelf`.
- Tag the pre-merge commit: `git tag pre-spine-wall && git push --tags` (the checkpoint).
- Full removal at any later date: `git revert <squash-sha>` — one commit, auto-deploys.
  Because the feature and the sync bot touch disjoint files, this revert applies cleanly
  no matter how many nightly sync commits have landed in between.

### Explicitly not the plan

`git reset --hard pre-spine-wall` + force-push. It works the day of the merge, but a week
later it would also erase every Notion sync commit since. `git revert` gives the same
outcome without rewriting history.

## Acceptance checklist (before squash-merge)

- [ ] Covers view with flag on = pixel-identical to production (default view unchanged).
- [ ] Flag off = built page identical to production (revert drill actually performed).
- [ ] Flip shows a real cover (e.g. one of the 86) and a tinted jacket (one without).
- [ ] Filters dim correctly in spines view; still hide correctly in covers view.
- [ ] Mobile (375px): horizontal scroll + tap-to-flip work; hint visible.
- [ ] Keyboard walk + Esc close; reduced-motion honored.
- [ ] Lighthouse/page-weight unchanged in covers view (no cover images preloaded by spines).

## Deferred (not in v1)

- Sort chips for the shelf (year / pages / rating — "page count = skyline" mode).
- Open Library backfill of missing covers via the nightly sync (separate task; makes the
  flip payoff fire more often — today it's real-cover 28% of the time).
- Spine view on the landing page or as a hero strip.
