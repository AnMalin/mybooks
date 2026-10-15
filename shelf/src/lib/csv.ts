import { Book, Format, Status } from '../types';

const COLS = ['title', 'author', 'format', 'status', 'rating', 'finishedAt', 'shelf', 'tags', 'isbn', 'pages', 'notes', 'coverUrl'] as const;

const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export function toCsv(books: Book[]): string {
  const rows = books.map(b => COLS.map(c => esc(c === 'tags' ? b.tags.join('; ') : b[c])).join(','));
  return [COLS.join(','), ...rows].join('\n');
}

/** Minimal RFC-4180 parser (quotes, escaped quotes, newlines inside quotes). */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') q = false;
      else cell += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(cell); cell = ''; }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(cell); cell = '';
      if (row.some(x => x !== '')) rows.push(row);
      row = [];
    } else cell += c;
  }
  row.push(cell);
  if (row.some(x => x !== '')) rows.push(row);
  return rows;
}

const normDate = (s: string): string | null => {
  s = (s || '').trim();
  let m = /^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/.exec(s);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})$/.exec(s);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
};

/**
 * Reads this app's own CSV export and also Goodreads exports
 * (Title, Author, My Rating, Date Read, Exclusive Shelf, Bookshelves, ISBN13, Number of Pages, My Review).
 */
export function fromCsv(text: string): Book[] {
  const [head, ...rows] = parseCsv(text.replace(/^﻿/, ''));
  if (!head) return [];
  const idx = (...names: string[]) => head.findIndex(h => names.includes(h.trim().toLowerCase()));
  const col = {
    title: idx('title'), author: idx('author'), format: idx('format', 'binding'),
    status: idx('status', 'exclusive shelf'), rating: idx('rating', 'my rating'),
    finished: idx('finishedat', 'date read'), shelf: idx('shelf', 'bookshelves'),
    tags: idx('tags'), isbn: idx('isbn', 'isbn13'), pages: idx('pages', 'number of pages'),
    notes: idx('notes', 'my review'), cover: idx('coverurl'),
  };
  if (col.title < 0) throw new Error('CSV needs a "title" column');
  const get = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '');
  return rows
    .filter(r => get(r, col.title))
    .map(r => {
      const rawStatus = get(r, col.status).toLowerCase();
      const status: Status = rawStatus === 'read' ? 'read' : rawStatus === 'reading' || rawStatus === 'currently-reading' ? 'reading' : 'want';
      const fmtRaw = get(r, col.format).toLowerCase();
      const format: Format = fmtRaw.includes('audio') ? 'audiobook' : 'book';
      const pages = parseInt(get(r, col.pages), 10);
      return {
        id: crypto.randomUUID(),
        title: get(r, col.title),
        author: get(r, col.author),
        format,
        status,
        rating: Math.min(5, Math.max(0, parseInt(get(r, col.rating), 10) || 0)),
        finishedAt: normDate(get(r, col.finished)),
        notes: get(r, col.notes),
        shelf: get(r, col.shelf).split(',')[0].trim(),
        tags: get(r, col.tags).split(/[;|]/).map(t => t.trim()).filter(Boolean),
        coverUrl: get(r, col.cover),
        isbn: get(r, col.isbn).replace(/[="]/g, ''),
        pages: Number.isFinite(pages) && pages > 0 ? pages : null,
        addedAt: new Date().toISOString(),
      };
    });
}
