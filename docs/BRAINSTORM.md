# stephenlongo.com — Section Brainstorm

*June 2026. Output of a wander through the Notion workspace. No commitments, just a map.*

## The thread that ties it together

The site already has a voice (dark, editorial, mono-serif) — what it needs is a **thesis**. From the
Notion Writing Ideas page, it's already written:

> "Essays on uncertainty, attention, and the search for meaningful craft — using trading,
> fatherhood, fitness, and AI as recurring proving grounds."

The strongest site sections are the ones where something deeply personal doubles as a
**method other people can borrow**. The bookshelf works because it's both: your taste, their
discovery. Every idea below is scored against that bar.

---

## Tier 1 — Flagship candidates (unique to you AND useful to others)

### 1. Annual Deep Reads — the Bible → Borges → Shakespeare arc
The single most distinctive thing in the workspace. One author/text per year, read daily,
25–30 min a morning: **Bible (2024), Borges (2025), Shakespeare (2026)**, with Dante /
Leaves of Grass on deck. The Shakespeare 2026 plan in Notion is already publishable: a
12-month schedule, ordering logic, resources (Bloom, Folger, No Fear), film pairings,
reflection questions, thematic index.

- **Why it stands out:** people constantly ask "how do I actually read Shakespeare / the
  canon?" Nobody answers with a tested, lived syllabus. You can.
- **Format:** one page per year. Syllabus as an editorial timeline, progress marker for the
  current year ("June: Problem Plays — Measure for Measure"), wrap-up essay when done
  (Borges WrapUp exists in Notion). Landing page shows the multi-year arc — that's the
  signature visual: *one person, one author a year, for life.*
- **Useful-to-others move:** keep the personal reflections, but make the plan itself
  copy-able. "Steal this syllabus."

### 2. The Matrix Review as a *method*, not just an artifact
The matrices are already live, and the layout is genuinely original. The upgrade: a page that
explains **how to do your own Matrix Review** (outcome × change-in-focus, the four quadrants,
how to score). Optionally an interactive builder: visitors plot their own activities on the
same chart and export an image.

- **Why:** this converts "personal stuff I'm hosting for now" into a framework with your name
  on it. The personal matrices become worked examples instead of the whole point.
- **Effort:** explainer page is cheap; interactive builder is a fun weekend project (Chart.js
  already on the site).

### 3. Field Notes on AI — "how I actually use it" as a living page
The "Attention is all YOU need" journal entry is the seed: AI as running coach, reading buddy
(Shakespeare/Karamazov/Borges on Metro-North), market dashboards, daily-driver .md system —
plus the hard-won lessons (productivity theater, sycophancy, "I control the regime,"
where to draw the human line).

- **Why it stands out:** practitioner voice, not influencer voice. A 20-year vol trader's
  grounded AI usage, versioned over time, is rare and useful.
- **Format:** a single living page with a **changelog** ("rev. June 2026"), not a feed.
  Sections: what I use it for / what I refuse to use it for / lessons. The revision history
  itself becomes interesting in five years.

---

## Tier 2 — Strong supporting sections

### 4. Reading Recs (distinct from the Bookshelf)
The Bookshelf is *everything* (307 books); the Notion "Reading Recs" page is the opposite —
a short, opinionated **start-here list** written from memory ("purposefully not looking at my
bookshelf"). That constraint is the charm. One page, annotated, maybe 25 items max.

### 5. Commonplace Book / Quote Board
The Quote Board + Compass viewpoints are a real commonplace book: Housel, McCarthy, Watts,
Jung, Rumi, Gioia. Editorial sites are made for this. Filterable by theme, one random quote
surfaced on the landing page. Low effort, high texture, infinitely accumulating.
*(Watch length-per-quote — keep excerpts short on the public site.)*

### 6. /now page
The nownownow.com convention, but auto-fed: currently reading (Shakespeare progress), training
for (next race), building (current repo). Cheap to build, syncs from Notion, makes the whole
site feel alive. Could live as a strip on the landing page instead of its own page.

### 7. Race Log
Personal, but earns its place two ways: (a) it's proof-of-practice for the essays about
training and effort, and (b) paired with the "AI as coach" story it becomes an angle, not a
diary. Format: single page, sparse table — date, race, time, pace — in the site's mono style.
Keep it small; don't build a Strava clone.

---

## Tier 3 — Park for later

- **Curricula shelf** — generalization of Annual Deep Reads: psych reading list, 12-month
  humanities course, kids' summer goals. Wait until Deep Reads proves the format.
- **Vol concepts for civilians** — "what volatility taught me about reality" as a glossary or
  essay series. Compelling but it's really Substack material first; the site can index it later.
- **Year-in-numbers dashboard** — books, miles, races, plays read, per year. Nice texture for
  the Annual Reviews section once there are 2–3 years of site history.
- **Picture grid / family artifacts** — stays private. Notion is the right home.

---

## Proposed architecture (when ready)

```
stephenlongo.com
├── Bookshelf            (live)
├── Musings              (live)
├── Area Under the Curve (external → Substack)
├── Annual Reviews       (live)  ← add "the method" explainer
├── Deep Reads           (new — flagship)
├── Field Notes on AI    (new — living page)
├── Reading Recs         (new — small)
├── Commonplace          (new — small)
└── /now                 (new — tiny, maybe just a landing-page strip)
```

The index rows on the landing page scale naturally — Index 005, 006, 007…

## Workflow notes

- Deep Reads syllabus + progress, Reading Recs, Quote Board, and /now can all sync from Notion
  the way Bookshelf/Musings already do (one new section in `scripts/sync-notion.mjs` each).
- The matrix builder is pure client-side JS — no Notion dependency.
- Sequencing suggestion: **Deep Reads first** (content already exists, highest signal),
  then the Matrix method explainer (rounds out an existing section), then /now (cheap),
  then Field Notes on AI (needs a writing pass on the existing draft).
