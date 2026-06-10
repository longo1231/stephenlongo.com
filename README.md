# stephenlongo.com

Personal site. The repo is the source of truth — content, covers, and design all live here and deploy to GitHub Pages on every push. Notion is an optional editing surface: run the sync to pull updates from it, but nothing depends on it at build or runtime.

## Stack

- [Astro](https://astro.build) static site — landing (`src/pages/index.astro`), bookshelf (`src/pages/bookshelf.astro`), musings (`src/pages/musings/`)
- Book data is committed at `src/data/books.json`; covers at `public/covers/`; musings as markdown at `src/content/musings/`
- `scripts/sync-notion.mjs` refreshes all of it from Notion (Bookshelf + Musings databases)
- Deploys via `.github/workflows/deploy.yml` to GitHub Pages at stephenlongo.com
- `.github/workflows/sync.yml` runs the Notion sync nightly (needs the `NOTION_TOKEN` repo secret) and commits any changes, which triggers a deploy

## Posting a musing

1. Open the Musings database in Notion (on the website page in Private)
2. Add a page: title it, set the Date, write the post as the page body
3. Check **Published** when it's ready — drafts stay invisible
4. It goes live on the next nightly sync, or immediately with `npm run sync` + commit

## Commands

```sh
npm install        # once
npm run dev        # local dev at localhost:4321
npm run build      # static build to dist/
npm run sync       # pull the full bookshelf from Notion (needs NOTION_TOKEN)
```

## Notion sync

Syncing is optional and manual — the site builds from the committed data either way. To pull the full shelf from Notion:

1. Create an internal integration at https://www.notion.so/my-integrations
2. In Notion, open the website page (Private section) → ⋯ → Connections → add the integration
3. Copy `.env.example` to `.env`, paste the token, and run `npm run sync`
4. Review the diff and commit — the push deploys it

Covers are downloaded into `public/covers/` during sync, so the live site never hotlinks external images.
