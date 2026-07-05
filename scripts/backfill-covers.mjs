// Backfills missing book covers from the Open Library covers API
// (https://openlibrary.org/dev/docs/api/covers). Deliberately conservative:
// a cover is only accepted on an exact normalized title match (plus author
// match when we have an author), existing covers are never replaced, and
// search requests are spaced out to stay inside Open Library's limits.
//
// Runs as part of `npm run sync`, or standalone against the checked-in
// books.json (no NOTION_TOKEN needed):
//   node scripts/backfill-covers.mjs --dry-run [--limit N]
//   node scripts/backfill-covers.mjs
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';

const COVERS_DIR = path.join(import.meta.dirname, '..', 'public', 'covers');
const BOOKS_JSON = path.join(import.meta.dirname, '..', 'src', 'data', 'books.json');
const SEARCH_URL = 'https://openlibrary.org/search.json';
// default=false makes missing covers 404 instead of returning a blank 1px image.
const coverUrl = (id) => `https://covers.openlibrary.org/b/id/${id}-L.jpg?default=false`;
// Open Library asks automated clients to identify themselves.
const HEADERS = { 'User-Agent': 'stephenlongo.com content sync (longo.steve@gmail.com)' };
const REQUEST_GAP_MS = 1100;
const MAX_CONSECUTIVE_FAILURES = 5;

export const slug = (title) =>
  title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// "The Beginning of Infinity!" -> "beginning of infinity"
export const norm = (s) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/^(the|a|an) /, '');

// Open Library titles sometimes fold the subtitle in, so both forms count.
const titleMatches = (book, doc) => {
  const got = norm(doc.title ?? '');
  if (!got) return false;
  const want = [book.title, book.subtitle && `${book.title} ${book.subtitle}`].filter(Boolean);
  return want.some((t) => norm(t) === got);
};

// Token-subset comparison so "Robert M. Pirsig" matches "Robert Pirsig".
const sameAuthor = (a, b) => {
  const ta = norm(a).split(' ').filter(Boolean);
  const tb = norm(b).split(' ').filter(Boolean);
  if (!ta.length || !tb.length) return false;
  const [small, big] = ta.length <= tb.length ? [ta, tb] : [tb, ta];
  return small.every((t) => big.includes(t));
};

async function findCoverId(book) {
  const params = new URLSearchParams({
    title: book.title,
    fields: 'title,author_name,cover_i',
    limit: '5',
  });
  if (book.author) params.set('author', book.author);
  const res = await fetch(`${SEARCH_URL}?${params}`, { headers: HEADERS });
  if (!res.ok) throw new Error(`search HTTP ${res.status}`);
  const { docs = [] } = await res.json();
  // With no author to cross-check, only an exact-title top hit is trusted.
  const candidates = book.author ? docs : docs.slice(0, 1);
  for (const doc of candidates) {
    if (!doc.cover_i || !titleMatches(book, doc)) continue;
    if (book.author && !(doc.author_name ?? []).some((n) => sameAuthor(book.author, n))) continue;
    return doc.cover_i;
  }
  return null;
}

async function downloadCover(coverId, file) {
  const res = await fetch(coverUrl(coverId), { headers: HEADERS });
  if (!res.ok) throw new Error(`cover HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (buf.length < 2000) throw new Error(`cover suspiciously small (${buf.length} bytes)`);
  await writeFile(path.join(COVERS_DIR, file), buf);
}

// Mutates `books`, filling in the cover field where a confident match is
// found. Returns the number of books whose cover field was set.
export async function backfillCovers(books, { dryRun = false, limit = Infinity } = {}) {
  await mkdir(COVERS_DIR, { recursive: true });
  let updated = 0;
  let searched = 0;
  let unmatched = 0;
  let failures = 0;
  for (const book of books) {
    if (book.cover || !book.title) continue;
    const file = `${slug(book.title)}.jpg`;
    // Downloaded by an earlier run: reuse the file without touching the network.
    if (existsSync(path.join(COVERS_DIR, file))) {
      if (!dryRun) {
        book.cover = `/covers/${file}`;
        updated++;
      }
      continue;
    }
    if (searched >= limit) continue;
    searched++;
    try {
      const coverId = await findCoverId(book);
      if (coverId) {
        console.log(`${dryRun ? 'would backfill' : 'backfilled'} "${book.title}" (cover ${coverId})`);
        if (!dryRun) {
          await downloadCover(coverId, file);
          book.cover = `/covers/${file}`;
          updated++;
        }
      } else {
        unmatched++;
      }
      failures = 0;
    } catch (err) {
      console.warn(`cover backfill failed for "${book.title}": ${err.message}`);
      if (++failures >= MAX_CONSECUTIVE_FAILURES) {
        console.warn('Open Library looks unreachable; skipping remaining cover backfill.');
        break;
      }
    }
    await sleep(REQUEST_GAP_MS);
  }
  console.log(
    `Cover backfill: ${searched} searched, ${unmatched} no confident match, ` +
      `${updated} cover${updated === 1 ? '' : 's'} ${dryRun ? 'would be ' : ''}set.`,
  );
  return updated;
}

if (process.argv[1] && import.meta.filename === path.resolve(process.argv[1])) {
  const dryRun = process.argv.includes('--dry-run');
  const limitFlag = process.argv.indexOf('--limit');
  const limit = limitFlag === -1 ? Infinity : Number(process.argv[limitFlag + 1]);
  const data = JSON.parse(await readFile(BOOKS_JSON, 'utf8'));
  const updated = await backfillCovers(data.books, { dryRun, limit });
  if (updated > 0) {
    await writeFile(BOOKS_JSON, JSON.stringify(data, null, 2));
    console.log(`Updated ${path.relative(process.cwd(), BOOKS_JSON)}`);
  }
}
