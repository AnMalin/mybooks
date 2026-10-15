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
- **Covers** — generated typographic covers by default; "Find cover & details" and "Fetch missing covers" use the free [Open Library](https://openlibrary.org/dev/docs/api/search) API.
- **Stats** — books per year / month, rating distribution, top authors, shelves, reading goal.
- **Import / export** — JSON, CSV, and Goodreads CSV exports (merge, duplicates skipped).
- **Dark mode**, keyboard accessible, responsive, undo on delete.

## Data

The first run loads the 348 books from the original app (`src/data/seed.json`, generated from `../export/books.json` by
`tools/seed-from-export.mjs`). After that, your changes live in `localStorage` under `shelf.books.v1`.
Use **Export JSON** regularly as a backup; **Reset to original books** restores the starting data.
