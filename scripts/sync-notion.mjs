// Pulls site content from Notion: the Bookshelf into src/data/books.json and
// published Musings into src/content/musings/*.md.
// Requires NOTION_TOKEN (internal integration with access to the website page).
import { Client } from '@notionhq/client';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { backfillCovers, slug } from './backfill-covers.mjs';

const BOOKS_DS_ID = '69e03bba-77cd-44fa-9c66-f0924275795b';
const MUSINGS_DS_ID = '18f634dd-d2f1-4013-b8d3-05787febd521';
const OUT = path.join(import.meta.dirname, '..', 'src', 'data', 'books.json');
const COVERS_DIR = path.join(import.meta.dirname, '..', 'public', 'covers');
const MUSINGS_DIR = path.join(import.meta.dirname, '..', 'src', 'content', 'musings');

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
// Covers are copied into the repo so the site never depends on external image hosts.
// Existing files are kept as-is: image hosts re-encode on every request, which
// would otherwise produce a spurious commit (and deploy) on every sync.
await mkdir(COVERS_DIR, { recursive: true });
async function localCover(url, title) {
  if (!url) return null;
  const file = `${slug(title)}.jpg`;
  if (existsSync(path.join(COVERS_DIR, file))) return `/covers/${file}`;
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
    data_source_id: BOOKS_DS_ID,
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

// Notion covers win; Open Library fills in the rest where it can.
await backfillCovers(books);

await writeFile(
  OUT,
  JSON.stringify(
    { syncedAt: new Date().toISOString().slice(0, 10), source: 'notion-api', books },
    null,
    2,
  ),
);
console.log(`Synced ${books.length} books to ${path.relative(process.cwd(), OUT)}`);

// --- Musings: each published page becomes a markdown file ---

const richText = (rt) =>
  (rt ?? [])
    .map((t) => {
      let s = t.plain_text;
      if (t.annotations?.code) s = `\`${s}\``;
      if (t.annotations?.bold) s = `**${s}**`;
      if (t.annotations?.italic) s = `*${s}*`;
      if (t.href) s = `[${s}](${t.href})`;
      return s;
    })
    .join('');

async function blocksToMarkdown(blockId, indent = '') {
  const lines = [];
  let cur;
  do {
    const res = await notion.blocks.children.list({
      block_id: blockId,
      start_cursor: cur,
      page_size: 100,
    });
    for (const b of res.results) {
      const t = b.type;
      const text = richText(b[t]?.rich_text);
      if (t === 'paragraph') lines.push(text ? `${indent}${text}\n` : '');
      else if (t === 'heading_1') lines.push(`${indent}## ${text}\n`);
      else if (t === 'heading_2') lines.push(`${indent}## ${text}\n`);
      else if (t === 'heading_3') lines.push(`${indent}### ${text}\n`);
      else if (t === 'bulleted_list_item') lines.push(`${indent}- ${text}`);
      else if (t === 'numbered_list_item') lines.push(`${indent}1. ${text}`);
      else if (t === 'to_do') lines.push(`${indent}- [${b.to_do.checked ? 'x' : ' '}] ${text}`);
      else if (t === 'quote') lines.push(`${indent}> ${text}\n`);
      else if (t === 'divider') lines.push(`${indent}---\n`);
      else if (t === 'code')
        lines.push(`${indent}\`\`\`${b.code.language ?? ''}\n${text}\n${indent}\`\`\`\n`);
      if (b.has_children && t !== 'child_page' && t !== 'child_database') {
        lines.push(await blocksToMarkdown(b.id, indent + '  '));
      }
    }
    cur = res.has_more ? res.next_cursor : undefined;
  } while (cur);
  return lines.join('\n');
}

await rm(MUSINGS_DIR, { recursive: true, force: true });
await mkdir(MUSINGS_DIR, { recursive: true });

let musingsCount = 0;
cursor = undefined;
do {
  const res = await notion.dataSources.query({
    data_source_id: MUSINGS_DS_ID,
    filter: { property: 'Published', checkbox: { equals: true } },
    start_cursor: cursor,
    page_size: 100,
  });
  for (const page of res.results) {
    const title = plain(page.properties['Title']?.title);
    if (!title) continue;
    const date =
      page.properties['Date']?.date?.start ?? page.created_time.slice(0, 10);
    const body = await blocksToMarkdown(page.id);
    const frontmatter = `---\ntitle: ${JSON.stringify(title)}\ndate: ${date}\n---\n\n`;
    await writeFile(path.join(MUSINGS_DIR, `${slug(title)}.md`), frontmatter + body.trim() + '\n');
    musingsCount++;
  }
  cursor = res.has_more ? res.next_cursor : undefined;
} while (cursor);
console.log(`Synced ${musingsCount} musings to ${path.relative(process.cwd(), MUSINGS_DIR)}`);
