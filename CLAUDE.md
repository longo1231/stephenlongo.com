# stephenlongo.com

Personal static site. Astro → GitHub Pages at stephenlongo.com. Start with [README.md](README.md)
for the stack, commands, and the Notion sync flow; this file adds the working rules and the
things that aren't obvious from the tree.

## Source of truth

The **repo is authoritative**. Content, covers, and design all live here and deploy on every
push to `main`. Notion is an *optional* editing surface — `npm run sync` pulls from it, but
nothing reads Notion at build or runtime. The Notion database IDs are hardcoded in
[scripts/sync-notion.mjs](scripts/sync-notion.mjs); a fresh clone needs only `NOTION_TOKEN`
(see [.env.example](.env.example)) to sync, nothing from anyone's local machine.

## Layout

- `src/pages/` — routes: `index`, `bookshelf`, `misogi`, `reviews` (+ `reviews/*-matrix`),
  `musings/`. Each page is self-contained Astro with scoped `<style>`.
- `src/components/` — `SpineWall`, `SeasonDiorama`, `MatrixReview`.
- `src/data/` — `books.json` (synced) and `misogi.json` (synced). Committed, self-describing.
- `src/content/musings/` — published musings as markdown (synced).
- `public/covers/` — book covers, one JPG per book, committed.
- `docs/` — one spec per major feature. Keep them in sync when you change a feature.
- `scripts/` — see below.

## Invariants (don't break these)

- **Never hotlink external images.** Covers are downloaded into `public/covers/` during sync
  precisely so the live site never depends on an image host. New imagery follows the same rule.
- **The sync must not churn.** Existing covers are kept as-is on re-sync — image hosts re-encode
  on every request, so re-downloading would produce a spurious commit (and deploy) every night.
  If you touch cover logic, preserve the "skip if the file already exists" behavior.
- **Content edits go through Notion + sync, not hand edits** to `books.json` / `misogi.json` /
  `musings/*.md` — the next nightly sync would overwrite hand edits. Edit in Notion, run sync,
  commit. (Design, layout, and one-off data like the matrix pages are repo-only and safe to edit.)
- Known exception to "no external hosts": [MatrixReview](src/components/MatrixReview.astro)
  loads Chart.js from a CDN. It's the only runtime external dependency. See the reviews spec.

## Loop

```sh
npm run dev     # localhost:4321
npm run build   # static build to dist/
npm run sync    # pull from Notion (needs NOTION_TOKEN); review diff, then commit
```

Deploy is automatic: push to `main` → `.github/workflows/deploy.yml`. The nightly
`.github/workflows/sync.yml` runs the sync and commits changes, which triggers a deploy.

## Voice

Stephen's copy uses **no em dashes, ever** — commas and periods only. Preserve his exact
punctuation and wording in any content he wrote; don't "improve" it.
