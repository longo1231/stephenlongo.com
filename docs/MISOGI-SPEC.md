# Reading Misogi — Spec

*July 2026. The annual hard-reading challenge as a site section: Karamazov (2023) → the
Bible (2024) → Borges (2025) → Shakespeare (2026, in progress). This is BRAINSTORM.md's
Tier-1 idea #1 ("Annual Deep Reads"), renamed to Stephen's own term and re-aimed: the
**method** is the focal point, not retrospective reviews.*

## The editorial stance (from Stephen, verbatim spirit)

- This is not normal reading. Each year's work is **chosen intentionally, structured
  daily, and scaffolded deliberately** — that's the story.
- The centerpiece is **HOW**: 20 min/day for the Bible with a dedicated narrative podcast
  plus per-book videos; Borges with heavy AI assistance; Shakespeare on a custom route
  that crests at the tragedies in high summer, with Bloom on the desk and a dedicated AI
  conversation per play.
- Per-work reviews (2–3 sentences per Shakespeare play, some Borges) will trickle in but
  are **not load-bearing** — the page must stand complete without them.
- AI is a real part of the method since 2025; present it matter-of-factly inside the
  scaffolding, not as the headline. (The full AI story belongs to the future "Field Notes
  on AI" page — BRAINSTORM idea #3.)
- Above all: **useful to others.** "People constantly ask 'how do I actually read
  Shakespeare / the canon?' Nobody answers with a tested, lived syllabus."

## Options considered

**A — Fold into the Bookshelf** (misogi filter chip, special shelf, richer pull modal).
Rejected as the home: a modal can't hold a method essay; "complete works of Borges" isn't
really one shelf row; and it would burden the site's flagship. (Light cross-links survive
below.)

**B — One page per year** (`/misogi/2024` …). Right shape *eventually*, premature now:
two of four years have thin content, and four stub pages read emptier than one strong one.

**C — One page + hooks (chosen).** A single `/misogi` page carrying the whole arc, with
small pointers from the bookshelf and the homepage index. Upgrade paths to B are defined
and cheap (anchors become subpages when a year outgrows its chapter).

## The page: `/misogi`

Standard page chrome (top bar, `Index — 005 / Misogi`, footer). Five parts:

### 1 · Definition hero
"Reading *Misogi*" in the site's display serif. One short paragraph: one deliberately
oversized reading project per year — picked on purpose, structured daily, scaffolded
shamelessly. One line for strangers on the term (one hard thing a year; the reading
version). Tone: plain, not precious. *"The point isn't having read it. It's the year
spent reading it."*

### 2 · The arc — four spines (signature visual)
The multi-year arc as **four oversized spines standing on one shelf line**, reusing the
Spine Wall's visual language (hue tints, widths, the 3px shelf) so the two features are
visibly kin: Karamazov (slim), the Bible (massive), Borges (wide), Shakespeare (widest,
half-pulled off the shelf — it's in progress). Mono year labels beneath; a ghost spine
for 2027 labeled `?`. Clicking a spine scrolls to its chapter. Pure CSS, no images, ~60
lines — this is the "one person, one mountain a year" picture from the brainstorm.

### 3 · Chapters, one per year (the format)
Each chapter has an identical skeleton, so the constant (method) reads across changing
mountains:

- **Kicker** (mono): `2024 · THE BIBLE · COVER TO COVER · 366 DAYS`
- **Why this one** — 1–2 sentences on the intentional choice.
- **The Protocol** — the heart of the page. A bordered "recipe card" with mono-labeled
  rows, identical labels every year:
  - `CADENCE` — e.g. 20 minutes, every morning, non-negotiable.
  - `ROUTE` — the order and why: canonical Genesis→Revelation; publication-order Borges;
    the Shakespeare ladder — acclimatize on comedies/histories, crest at the tragedies in
    high summer, descend through the romances.
  - `SCAFFOLDING` — the honest list: dedicated narrative podcast + per-book videos
    (Bible); Bloom and Folger on the desk; **a dedicated AI conversation per play — a
    reading partner that never tires of questions** (2025 onward).
  - `RULES` — what counts as done, what happens on a missed day.
- **What it gave me** — 1–3 sentences, optional, can land later.
- **Artifacts** — optional per year. Shakespeare (2026) ships one in v1: **the Route** —
  the ordered play list as a vertical ladder with read / current / upcoming states
  (`● Hamlet — June` … `◐ King Lear — now` … `○ The Tempest — December`). Each rung has
  an empty slot where a 2–3 sentence verdict appears as written. The in-progress state is
  a feature, not a gap: visitors see a misogi mid-climb.

### 4 · "Run your own" (the for-others payload)
Six to eight distilled principles, mono-numbered, compact: pick one mountain a year ·
make it slightly too big · set a daily minimum dose · scaffold shamelessly (podcasts,
critics, AI — whatever keeps you moving) · order the route around your seasons · keep a
log · let it end and pick the next one. Closes with "steal the syllabus" pointing at the
Shakespeare route.

### 5 · Bookshelf & homepage hooks
- Homepage: new index row `Index — 005 / Misogi` (rows scale by design).
- Bookshelf: the misogi books get a small mono tag in the covers-grid overlay and the
  Spine Wall pull modal — `MISOGI '24 →` linking to `/misogi#2024`.
- Flag source: a **`Misogi` checkbox** on the Notion Bookshelf (added via MCP, checked
  for the three completed books), one line in `sync-notion.mjs` to carry it into
  books.json. (Shakespeare gets a shelf entry + checkbox when 2026 wraps.)

## Content model (v1.1 implemented 2026-07-06 — Notion is the editing surface)

- **Prose lives in Notion.** A `Misogi` page under the website page holds a `Misogi`
  database (data source `17797c7c-93ad-4e65-b239-ccb1acfb8d97`): one row per year with
  `Work / Year / Kicker / Why / Cadence / Route / Scaffolding / Rules / What it gave me`.
  Edit a cell → nightly sync updates the site.
- **Play state lives where Stephen already logs.** The existing `Shakespeare Play Reading`
  database (data source `2daeccc1-8462-806b-a137-000b6e74c298`) gained a `Verdict` text
  property; its `Status` (Not started / In progress / Done) drives the route ladder's
  dots and "now" highlight. Plays are matched by normalized title. **Requires the
  Shakespeare 2026 page tree to be shared with the site's sync integration** — until
  then the sync warns and keeps the repo values.
- **Skeleton stays in-repo.** `src/data/misogi.json` keeps the route months, one-line
  play notes, spine design, and the "run your own" principles; the sync merges Notion
  values into it and rewrites the file. Empty Notion fields fall back to repo values —
  except `What it gave me`, where empty is meaningful (hides the line).

## Content needed from Stephen (page ships with placeholders marked TODO)

1. Bible: the specific narrative podcast + the per-book video/podcast sources (names).
2. Karamazov: translation read, and whatever structure existed (it's the origin story —
   "the baby one" framing is itself the content).
3. Borges: edition/collections covered, reading order, what the AI setup looked like.
4. Shakespeare: the exact route order + current position (the Notion "Shakespeare 2026"
   page and play log will be mined during implementation).
5. 2027 candidate for the ghost spine, if any (Dante? Leaves of Grass? — per BRAINSTORM).

## Files touched

| File | Change |
|---|---|
| `src/pages/misogi.astro` | **New.** Page, arc visual, protocol cards, route ladder. |
| `src/data/misogi.json` | **New.** All content, hand-edited until v1.1 sync. |
| `src/pages/index.astro` | One new index row. |
| `src/pages/bookshelf.astro` + `SpineWall.astro` | Misogi tag in overlay/modal (~10 lines total). |
| `scripts/sync-notion.mjs` | One line (`misogi` checkbox field). v1.1: plays section. |

## Rollback

Same two layers as the Spine Wall: the page is additive (delete the index row + page =
gone); bookshelf tags sit behind the `misogi` field being present. Nightly-sync overlap
is one additive field in books.json — nothing the bot writes can break the page.

## Explicitly deferred

- Per-year subpages (`/misogi/shakespeare`) — when a year's chapter outgrows the page.
- Borges verdicts, Bible per-book notes — same trickle-in mechanism as plays.
- "Curricula shelf" generalization (BRAINSTORM Tier-3) — after this proves the format.
- The full AI-methods story — belongs to Field Notes on AI (BRAINSTORM #3).
