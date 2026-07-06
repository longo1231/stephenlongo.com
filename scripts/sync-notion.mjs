// Pulls site content from Notion: the Bookshelf into src/data/books.json,
// published Musings into src/content/musings/*.md, and the Reading Misogi
// protocols + Shakespeare play log into src/data/misogi.json.
// Requires NOTION_TOKEN (internal integration with access to the website page).
import { Client } from '@notionhq/client';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
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
      misogi: p['Misogi']?.checkbox ?? false,
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

// --- Reading Misogi: Notion carries the prose and the live reading state; the
// repo file keeps the skeleton (route months/notes, spine design, principles).
// Each part degrades gracefully so a permissions hiccup can't break the sync.

const MISOGI_DS_ID = '17797c7c-93ad-4e65-b239-ccb1acfb8d97'; // "Misogi" DB under the website page
const PLAYS_DS_ID = '2daeccc1-8462-806b-a137-000b6e74c298'; // "Shakespeare Play Reading" log
const MISOGI_OUT = path.join(import.meta.dirname, '..', 'src', 'data', 'misogi.json');

const misogi = JSON.parse(await readFile(MISOGI_OUT, 'utf8'));

async function queryAll(data_source_id) {
  const rows = [];
  let cur;
  do {
    const res = await notion.dataSources.query({ data_source_id, start_cursor: cur, page_size: 100 });
    rows.push(...res.results);
    cur = res.has_more ? res.next_cursor : undefined;
  } while (cur);
  return rows;
}

try {
  let years = 0;
  for (const page of await queryAll(MISOGI_DS_ID)) {
    const p = page.properties;
    const y = misogi.years.find((x) => x.id === String(p['Year']?.number ?? ''));
    if (!y) continue;
    y.title = plain(p['Work']?.title) || y.title;
    y.kicker = plain(p['Kicker']?.rich_text) || y.kicker;
    y.why = plain(p['Why']?.rich_text) || y.why;
    y.protocol.cadence = plain(p['Cadence']?.rich_text) || y.protocol.cadence;
    y.protocol.route = plain(p['Route']?.rich_text) || y.protocol.route;
    y.protocol.scaffolding = plain(p['Scaffolding']?.rich_text) || y.protocol.scaffolding;
    y.protocol.rules = plain(p['Rules']?.rich_text) || y.protocol.rules;
    y.gave = plain(p['What it gave me']?.rich_text); // empty is meaningful: hides the line
    years++;
  }
  console.log(`Synced ${years} misogi protocols`);
} catch (err) {
  console.warn(`misogi protocols skipped: ${err.message}`);
}

try {
  const statusMap = { Done: 'done', 'In progress': 'now', 'Not started': 'up' };
  // Forgiving title match: articles, punctuation, possessives/plurals,
  // labour/labor, and roman vs arabic part numbers all normalize away
  // ("Henry IV Part I" == "Henry IV, Part 1", "Love's Labor Lost" ==
  // "Love's Labour's Lost"). Applied to both sides, so mangling is harmless
  // as long as distinct plays stay distinct.
  const key = (s) =>
    s
      .toLowerCase()
      .replace(/['’]/g, '')
      .replace(/^(the|a|an) /, '')
      .replace(/labour/g, 'labor')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim()
      .replace(/\bpart (i{1,3})\b/g, (_, r) => `part ${r.length}`)
      .replace(/s\b/g, '');
  const log = new Map();
  for (const page of await queryAll(PLAYS_DS_ID)) {
    const p = page.properties;
    log.set(key(plain(p['Name']?.title)), {
      status: statusMap[p['Status']?.status?.name],
      verdict: plain(p['Verdict']?.rich_text),
    });
  }
  let matched = 0;
  for (const month of misogi.route) {
    for (const play of month.plays) {
      const k = key(play.name);
      let row = log.get(k);
      // Shorthand fallback ("Two Gentlemen"): accept a log row whose key is a
      // fragment of this play's key (or vice versa) only if it's unambiguous.
      if (!row) {
        const hits = [...log.keys()].filter(
          (lk) => lk.length >= 8 && (k.includes(lk) || lk.includes(k)),
        );
        if (hits.length === 1) row = log.get(hits[0]);
      }
      if (!row) continue;
      if (row.status) play.status = row.status;
      if (row.verdict) play.verdict = row.verdict;
      matched++;
    }
  }
  console.log(`Synced ${matched} plays from the Shakespeare log (${log.size} log rows)`);
} catch (err) {
  console.warn(`Shakespeare play log skipped (shared with the integration?): ${err.message}`);
}

// "Run your own" principles: the numbered list under the "Run your own"
// heading on the Misogi page itself.
const MISOGI_PAGE_ID = '395eccc1-8462-81c3-861f-d4ca8ecb394b';
try {
  const blocks = [];
  let cur2;
  do {
    const res = await notion.blocks.children.list({
      block_id: MISOGI_PAGE_ID,
      start_cursor: cur2,
      page_size: 100,
    });
    blocks.push(...res.results);
    cur2 = res.has_more ? res.next_cursor : undefined;
  } while (cur2);
  const items = [];
  let inList = false;
  for (const b of blocks) {
    const t = b.type;
    if (t.startsWith('heading_')) inList = /run your own/i.test(plain(b[t]?.rich_text));
    else if (inList && (t === 'numbered_list_item' || t === 'bulleted_list_item')) {
      const text = plain(b[t].rich_text).trim();
      if (text) items.push(text);
    }
  }
  if (items.length) {
    misogi.principles = items;
    console.log(`Synced ${items.length} misogi principles`);
  }
} catch (err) {
  console.warn(`misogi principles skipped: ${err.message}`);
}

await writeFile(MISOGI_OUT, JSON.stringify(misogi, null, 2) + '\n');
console.log(`Wrote ${path.relative(process.cwd(), MISOGI_OUT)}`);
