# Shelf

A small, fast, offline-first reading library. Everything is stored in your browser (localStorage) — no account or server.

## Run

```
npm install
npm run dev        # http://localhost:3024
npm run build      # production build in dist/
```

## Features

- **Library** — grid or table view, search (title, author, tags, notes), filters (status, shelf, format, rating), sorting.
- **Status** — Read / Reading / To read, with rating (1–5), finish date, shelf, tags, ISBN, pages, notes.
- **Covers** — real covers load automatically, only for the books you scroll past, from [Open Library](https://openlibrary.org/dev/docs/api/search) with [Google Books](https://developers.google.com/books/docs/v1/using) as a fallback (both free, no key). Books with no match keep a generated cover and are not re-checked for 30 days. Titles and authors are sent to those two services; turn this off in the `⋯` menu ("Auto-load covers while browsing"). "Find all missing covers now" runs the lookup for the whole library.
- **Stats** — books per year / month, rating distribution, top authors, shelves, reading goal.
- **Import / export** — JSON, CSV, and Goodreads CSV exports (merge, duplicates skipped).
- **Dark mode**, keyboard accessible, responsive, undo on delete.

## Data

The first run loads the 348 books from the original app (`src/data/seed.json`, generated from `../export/books.json` by
`tools/seed-from-export.mjs`). After that, your changes live in `localStorage` under `shelf.books.v1`.
Use **Export JSON** regularly as a backup; **Reset to original books** restores the starting data.
