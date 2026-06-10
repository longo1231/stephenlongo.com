# stephenlongo.com

Personal site. The repo is the source of truth — content, covers, and design all live here and deploy to GitHub Pages on every push. Notion is an optional editing surface: run the sync to pull updates from it, but nothing depends on it at build or runtime.

## Stack

- [Astro](https://astro.build) static site — `src/pages/index.astro` (landing) and `src/pages/bookshelf.astro`
- Book data is committed at `src/data/books.json`; covers are committed at `public/covers/`
- `scripts/sync-notion.mjs` optionally refreshes both from the Bookshelf database in Notion
- Deploys via `.github/workflows/deploy.yml` to GitHub Pages at stephenlongo.com

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
