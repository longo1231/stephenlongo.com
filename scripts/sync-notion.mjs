// Pulls the full Bookshelf from Notion into src/data/books.json.
// Requires NOTION_TOKEN (internal integration with access to the website page).
// Data source ID is the Bookshelf collection inside the website page.
import { Client } from '@notionhq/client';
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';

const DATA_SOURCE_ID = '69e03bba-77cd-44fa-9c66-f0924275795b';
const OUT = path.join(import.meta.dirname, '..', 'src', 'data', 'books.json');
const COVERS_DIR = path.join(import.meta.dirname, '..', 'public', 'covers');

const token = process.env.NOTION_TOKEN;
if (!token) {
  console.error('NOTION_TOKEN is not set. Copy .env.example to .env and add your integration token.');
  process.exit(1);
}

const notion = new Client({ auth: token });

const plain = (rich) => (rich ?? []).map((t) => t.plain_text).join('');
const fileUrl = (files) => {
  const f = (files ?? [])[0];
  if (!f) return null;
  return f.type === 'external' ? f.external.url : f.file?.url ?? null;
};
const slug = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// Covers are copied into the repo so the site never depends on external image hosts.
await mkdir(COVERS_DIR, { recursive: true });
async function localCover(url, title) {
  if (!url) return null;
  const file = `${slug(title)}.jpg`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(path.join(COVERS_DIR, file), Buffer.from(await res.arrayBuffer()));
    return `/covers/${file}`;
  } catch (err) {
    console.warn(`cover failed for "${title}": ${err.message}`);
    return null;
  }
}

const books = [];
let cursor;
do {
  const res = await notion.dataSources.query({
    data_source_id: DATA_SOURCE_ID,
    start_cursor: cursor,
    page_size: 100,
  });
  for (const page of res.results) {
    const p = page.properties;
    const title = plain(p['Title']?.title);
    if (!title) continue;
    books.push({
      title,
      author: plain(p['Author']?.rich_text),
      subtitle: plain(p['Subtitle']?.rich_text),
      tagline: plain(p['Tagline']?.rich_text),
      takeaway: plain(p['Takeaway']?.rich_text),
      rating: p['Rating']?.select ? parseInt(p['Rating'].select.name, 10) || null : null,
      status: p['Status']?.select?.name ?? null,
      type: p['Type']?.select?.name ?? null,
      pages: p['Pages']?.number ?? null,
      date: p['Date']?.date?.start ?? null,
      recommend: p['Recommend']?.checkbox ?? false,
      cover: await localCover(fileUrl(p['Cover']?.files), title),
    });
  }
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);

books.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

await writeFile(
  OUT,
  JSON.stringify(
    { syncedAt: new Date().toISOString().slice(0, 10), source: 'notion-api', books },
    null,
    2,
  ),
);
console.log(`Synced ${books.length} books to ${path.relative(process.cwd(), OUT)}`);
