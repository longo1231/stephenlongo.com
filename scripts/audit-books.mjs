// One-off audit of book metadata against Open Library. Looks at every book
// the cover backfill couldn't confirm (no cover match, or an empty author)
// and proposes the closest confident Open Library record — typo'd titles,
// misspelled or missing authors. Output is a review table only: nothing is
// written to Notion until a human strikes the wrong rows and signs off.
//   node scripts/audit-books.mjs [--limit N]
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { norm } from './backfill-covers.mjs';

const BOOKS_JSON = path.join(import.meta.dirname, '..', 'src', 'data', 'books.json');
const REPORT = path.join(import.meta.dirname, '..', 'docs', 'BOOK-AUDIT.md');
const SEARCH_URL = 'https://openlibrary.org/search.json';
const HEADERS = { 'User-Agent': 'stephenlongo.com content sync (longo.steve@gmail.com)' };
const REQUEST_GAP_MS = 1100;
const FIELDS = 'title,author_name,cover_i,edition_count';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const lev = (a, b) => {
  if (!a.length || !b.length) return Math.max(a.length, b.length);
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
};
const sim = (a, b) => {
  a = norm(a ?? '');
  b = norm(b ?? '');
  if (!a || !b) return 0;
  return 1 - lev(a, b) / Math.max(a.length, b.length);
};

// Best title similarity, allowing for OL folding the subtitle into the title.
const titleSim = (book, doc) => {
  const variants = [book.title, book.subtitle && `${book.title} ${book.subtitle}`].filter(Boolean);
  return Math.max(...variants.map((v) => sim(v, doc.title)));
};
const authorSim = (book, doc) =>
  book.author ? Math.max(0, ...(doc.author_name ?? []).map((n) => sim(book.author, n))) : 0;

async function search(params) {
  const res = await fetch(`${SEARCH_URL}?${new URLSearchParams({ ...params, fields: FIELDS, limit: '10' })}`, {
    headers: HEADERS,
  });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  return (await res.json()).docs ?? [];
}

// Rank candidates by title similarity, with author similarity, having a
// cover, and edition count as gentle tiebreakers (popular records first).
function best(book, docs) {
  let top = null;
  for (const doc of docs) {
    if (!doc.title || !(doc.author_name ?? []).length) continue;
    const ts = titleSim(book, doc);
    const score =
      ts + authorSim(book, doc) * 0.4 + (doc.cover_i ? 0.05 : 0) + Math.min(doc.edition_count ?? 0, 50) / 1000;
    if (!top || score > top.score) top = { doc, ts, score };
  }
  return top;
}

async function suggest(book) {
  // Pass 1: scoped title search. Pass 2 (typos often defeat pass 1): general query.
  let hit = best(book, await search({ title: book.title }));
  if (!hit || hit.ts < 0.55) {
    await sleep(REQUEST_GAP_MS);
    const q = book.author ? `${book.title} ${book.author}` : book.title;
    const fallback = best(book, await search({ q }));
    if (fallback && (!hit || fallback.ts > hit.ts)) hit = fallback;
  }
  if (!hit || hit.ts < 0.55) return null;
  return { title: hit.doc.title, author: hit.doc.author_name[0], ts: hit.ts, editions: hit.doc.edition_count ?? 0 };
}

const data = JSON.parse(await readFile(BOOKS_JSON, 'utf8'));
const limitFlag = process.argv.indexOf('--limit');
const limit = limitFlag === -1 ? Infinity : Number(process.argv[limitFlag + 1]);

const suspects = data.books.filter((b) => b.title && (!b.author || !b.cover)).slice(0, limit);
console.log(`${suspects.length} books to audit (empty author or no confirmed cover) of ${data.books.length}.`);

const fixes = []; // metadata differs from OL's record
const fills = []; // author empty, OL knows it
const clean = []; // metadata matches, OL just has no usable cover
const unknown = []; // no confident OL record found

for (const [i, book] of suspects.entries()) {
  try {
    const s = await suggest(book);
    if (!s) unknown.push(book);
    else {
      const titleDiffers = norm(s.title) !== norm(book.title);
      if (!book.author) fills.push({ book, s, titleDiffers });
      else if (titleDiffers || norm(s.author) !== norm(book.author)) fixes.push({ book, s, titleDiffers });
      else clean.push(book);
    }
  } catch (err) {
    console.warn(`audit failed for "${book.title}": ${err.message}`);
    unknown.push(book);
  }
  if ((i + 1) % 25 === 0) console.log(`…${i + 1}/${suspects.length}`);
  await sleep(REQUEST_GAP_MS);
}

const cell = (s) => String(s ?? '').replaceAll('|', '\\|');
const pct = (x) => `${Math.round(x * 100)}%`;
// Suggested columns show exactly what would be written to Notion: the title
// only changes when it differs beyond casing/punctuation (Open Library casing
// is too sloppy to trust for cosmetic rewrites).
const row = ({ book, s, titleDiffers }) =>
  `| ${cell(book.title)} | ${cell(book.author) || '—'} | ${cell(titleDiffers ? s.title : book.title)} | ${cell(s.author)} | ${pct(s.ts)} · ${s.editions} eds |`;
const header = `| Current title | Current author | → Suggested title | Suggested author | Match |\n|---|---|---|---|---|`;
const byTitle = (a, b) => (a.book ?? a).title.localeCompare((b.book ?? b).title);

const report = `# Book metadata audit — ${new Date().toISOString().slice(0, 10)}

Generated by \`scripts/audit-books.mjs\` from Open Library. **Review workflow: delete any
row that's wrong, edit any suggested cell that's close-but-off, then hand the file back —
the remaining rows get written to Notion as-is.**

## Fix: metadata differs from Open Library (${fixes.length})

${header}
${fixes.sort(byTitle).map(row).join('\n')}

## Fill: author missing in Notion (${fills.length})

${header}
${fills.sort(byTitle).map(row).join('\n')}

## Looks right — Open Library just has no matching cover (${clean.length})

No cleanup needed: ${clean.sort(byTitle).map((b) => cell(b.title)).join(' · ') || '—'}

## No confident Open Library match — needs a human (${unknown.length})

${unknown.sort(byTitle).map((b) => `- ${cell(b.title)}${b.author ? ` — ${cell(b.author)}` : ''}`).join('\n') || '—'}
`;

await writeFile(REPORT, report);
console.log(
  `Audit done: ${fixes.length} fixes, ${fills.length} author fills, ${clean.length} clean, ` +
    `${unknown.length} unmatched → ${path.relative(process.cwd(), REPORT)}`,
);
