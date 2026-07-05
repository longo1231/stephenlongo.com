# Spine Wall — Spec

*July 2026. A second way to view the Bookshelf: all 307 books as spines on one long shelf.
Additive feature, one page touched, designed to be reverted in one line.*

> **v2 (below, "The Bookcase") supersedes three v1 decisions:** the single horizontal
> scroll strip, the pull panel rendered below the shelf, and covers as the default view.
> Everything else in v1 (encodings, filters, a11y, rollback layers) carries forward.

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
the built page renders identically to the pre-feature page. (Not literally byte-for-byte:
Astro rewrites its internal scoped-style hash whenever the source file changes, and the
inert view-toggle script remains. The July 2026 revert drill confirmed the normalized markup
differs by two whitespace tokens out of 12,159 — nothing visible or behavioral.) Reverting
is a one-character edit, commit, push; the Pages action redeploys in ~1 minute. The code
stays in the repo for later tinkering.

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

## Acceptance checklist (verified 2026-07-05, before squash-merge)

- [x] Covers view with flag on = default view, grid unchanged (307 books, filters hide).
- [x] Flag off = renders identical to production — drill performed; normalized markup
      differed by 2 whitespace tokens out of 12,159.
- [x] Flip shows a real cover (The Three Marriages) and a tinted jacket (11/22/63).
- [x] Filters dim on the shelf (★★★★★ dims exactly 231 of 307); still hide in covers view.
- [x] Mobile (375px): shelf scrolls (7,852px wide), tap-to-flip works, panel stacks, hint visible.
- [x] Esc closes; spines are focusable buttons with aria-labels; reduced-motion media query in place.
- [x] No cover images loaded by the spines view — the pull-panel img is created on click only.

## Deferred (not in v1)

- Sort chips for the shelf (year / pages / rating — "page count = skyline" mode).
- ~~Open Library backfill of missing covers via the nightly sync~~ — **done, July 2026**:
  `scripts/backfill-covers.mjs` runs inside `npm run sync`; real-cover rate is now 66%
  (203/307) and climbs as Notion title/author fields get cleaned up.
- Spine view on the landing page or as a hero strip.

---

# v2 — The Bookcase

*July 2026. Same shelf, real furniture. The strip becomes a bookcase, the pull becomes a
modal, and spines become the front door. Supersedes the v1 sections noted at the top.*

## Why v2

Three problems surfaced living with v1:

1. **The strip doesn't read as a shelf.** 307 spines in one row is a 7,852px horizontal
   scroll — a data ribbon, not a bookcase. Nobody scrolls a real shelf sideways.
2. **The pull reveal can land off-screen.** The pull panel is a static block below the
   scroller; the cover — the whole payoff — is not guaranteed to be visible when you click.
3. **Covers-by-default undersells the good view.** The Spine Wall is the distinctive thing;
   with the cover backfill done (66% real covers), the flip payoff fires often enough to lead.

## 1 · Layout: wrap the strip into shelves

The single `overflow-x` strip becomes a **vertically stacked bookcase**: spines flow
left-to-right and wrap into as many shelves as the viewport needs. No horizontal scroll
anywhere; the page scrolls vertically like everything else on the site.

**The slot trick (how shelf lines work with wrapping).** A naive `flex-wrap` can't draw a
line under each wrapped row. Instead, every book sits in a `.slot`:

- `.case` — `display: flex; flex-wrap: wrap; align-items: flex-end; row-gap: 2.6rem;`
- `.slot` — fixed height **240px** (tallest spine 230px + air), `display: flex;
  align-items: flex-end;`, **`border-bottom: 3px solid var(--hairline)`**, `padding: 0 1.5px`
  (replaces the v1 3px gap).

Adjacent slots' bottom borders fuse into one continuous shelf line per row, and the line
**ends where the books end** on the final, partly-filled shelf — like a real bookcase.
Leaning five-stars keep their extra breathing room via `padding-left: 0.5rem` **on the slot**
(padding, not margin — margin would cut a hole in the shelf line; border spans the padding box).

Unchanged from v1: width = page count (14–44px), height = 170–230px jittered from the title
hash, hue tint, five-star lean (−4°/−6° + accent top edge), hover pop, filter dimming,
newest-first order, legend line.

Removed: the `Scroll →` hint (nothing scrolls sideways anymore). The mono detail line moves
**above the case** (between filters and shelves), doubling as the instruction:
`Click a spine to pull it off the shelf`.

Expected shape: ~7–8 shelves at 1200px, ~25 shelves at 375px — tall but it's a normal
vertical page scroll now, and mobile loses the awkward sideways swipe entirely.

Considered and rejected: side rails / an outer frame around the case (the ragged right edge
of wrapped rows makes a closed frame look broken); server-side chunking into fixed shelves
(the server doesn't know the viewport width — CSS wrap does).

## 2 · The pull: fixed, centered, always visible

Clicking a spine pulls the book **toward you**, not down the page. The v1 `.pull` panel
(same content: real cover or tinted jacket, stars, takeaway in quotes, `Recommended`, ✕)
becomes a **fixed-position modal**, centered in the viewport over a dim backdrop
(`rgba(8,8,9,0.7)`), so the cover is fully visible no matter which shelf you clicked or
where the page is scrolled. The clicked spine still tilts out (`.pulled`) behind it —
the book is visibly "off the shelf."

- Jacket grows to **180px** wide on desktop (the modal has room), 150px stacked on mobile;
  `max-width: min(560px, 100vw - 2rem)`, `max-height: 85vh` with internal scroll for long
  takeaways. The existing `sw-flip` rotateY animation plays on open, plus a 0.94→1 scale
  so it reads as "coming at you." Both collapse under `prefers-reduced-motion`.
- **Dialog semantics** (new in v2): `role="dialog"`, `aria-modal="true"`,
  `aria-labelledby` → the title; focus moves to ✕ on open and **returns to the spine** on
  close; body scroll locks while open. Esc / click-away / ✕ / same-spine-again all close,
  as in v1.
- Covers still load only on first open (`img` created on click) — the bookcase itself
  ships zero images.

## 3 · Spines become the default view

- Chip order flips: **`SPINES` `COVERS`**, spines active. Server markup renders the wall
  `.active` and the grid `view-hide` — spines-first paint, no flash for new visitors.
- `localStorage['bookshelf-view'] === 'covers'` switches back for returning visitors who
  prefer the grid; stored `'spines'` values from v1 are a no-op. Same key, same script.
- **Perf win, not just taste:** the covers grid eagerly shows 203 real covers (~6.5MB
  lazy-loading as you scroll); the bookcase is pure CSS. Spines-default makes the
  bookshelf's first paint image-free.
- No-JS visitors now land on the spines view: fully rendered, but the pull needs JS
  (spines are inert buttons; the covers grid is one JS-less toggle away — acceptable, and
  no worse than v1's JS-dependent view switch).
- **Kill switch interaction:** with `SPINE_WALL = false` the grid must render *without*
  `view-hide` — i.e. `class:list={['grid', { 'view-hide': SPINE_WALL }]}` — so the flag-off
  page still builds identically to pre-feature production. Re-run the v1 revert drill after
  implementation to confirm.

## Files touched (unchanged footprint)

| File | Change |
|---|---|
| `src/components/SpineWall.astro` | Strip → slotted bookcase; pull panel → fixed modal + dialog semantics; hint removed, detail line moved. |
| `src/pages/bookshelf.astro` | Chip order + default `active`/`view-hide` classes, ~5 script lines (read `'covers'` instead of `'spines'`), flag-conditional grid class. |

Still zero overlap with the nightly sync (`src/data`, `src/content`, `public/covers`),
so both v1 rollback layers work as written: flag off = pre-feature page; `git revert` of
the v2 squash commit = back to v1.

## Acceptance checklist (verified 2026-07-05 in dev preview)

- [x] No horizontal scroll at 1280px (7 shelves) or 375px (24 shelves); shelf line per row.
- [x] Leaning five-stars don't break the shelf line — lean slots use `padding-left: 8px`,
      `margin-left: 0`, border intact.
- [x] Pull modal fully in viewport with cover visible: desktop mid-shelf (scrolled to
      y=1166) and mobile last shelf, both dead-centered. Fixed positioning makes it
      scroll-independent by construction.
- [x] Esc and backdrop click close (✕ shares the same handler); focus returns to the
      clicked spine; body scroll locks/unlocks; reduced-motion media query in place.
      Same-spine close is subsumed by the backdrop (it now covers the shelf).
- [x] Fresh profile lands on spines; stored `'covers'` flips on reload; ★★★★★ filter dims
      exactly 231 of 307 spines (76 five-stars).
- [x] Revert drill: `SPINE_WALL = false` build has zero `data-view` chips, no
      `#spine-wall` markup, no spine-data JSON, and the grid renders plain
      `class="grid"` (visible).
- [x] Zero `/covers/` requests before the first pull in spines view.
