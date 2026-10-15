import { useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, BookOpen, Download, ImageDown, LayoutGrid, Library, List, Moon, MoreHorizontal, Plus, RotateCcw, Search, Sun, Upload, X } from 'lucide-react';
import { Book, FORMAT_LABEL, Format, STATUS_LABEL, Status, emptyBook } from './types';
import { useLibrary } from './store';
import { fromCsv, toCsv } from './lib/csv';
import { download } from './lib/download';
import { searchOpenLibrary } from './lib/openlibrary';
import BookCard from './components/BookCard';
import BookTable, { SortKey } from './components/BookTable';
import BookDialog from './components/BookDialog';
import Stats from './components/Stats';

type Toast = { msg: string; undo?: () => void };

const SORTS: { key: SortKey; label: string }[] = [
  { key: 'latest', label: 'Latest' },
  { key: 'title', label: 'Title' },
  { key: 'author', label: 'Author' },
  { key: 'rating', label: 'Rating' },
];

export default function App() {
  const lib = useLibrary();
  const { books } = lib;

  const [tab, setTab] = useState<'library' | 'stats'>('library');
  const [view, setView] = useState<'grid' | 'table'>('grid');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<Status | 'all'>('all');
  const [shelf, setShelf] = useState('');
  const [format, setFormat] = useState<Format | ''>('');
  const [rating, setRating] = useState(0);
  const [sort, setSort] = useState<SortKey>('latest');
  const [dir, setDir] = useState<'asc' | 'desc'>('desc');
  const [dialog, setDialog] = useState<{ book: Book; isNew: boolean } | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const [coverJob, setCoverJob] = useState<{ done: number; total: number } | null>(null);
  const cancelCovers = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  const say = (msg: string, undo?: () => void) => {
    setToast({ msg, undo });
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), undo ? 7000 : 4000);
  };

  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark);
    try { localStorage.setItem('shelf.theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
  }, [dark]);

  useEffect(() => {
    if (!menuOpen) return;
    const close = (e: MouseEvent) => !(e.target as HTMLElement).closest('[data-menu]') && setMenuOpen(false);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [menuOpen]);

  const counts = useMemo(() => ({
    all: books.length,
    read: books.filter(b => b.status === 'read').length,
    reading: books.filter(b => b.status === 'reading').length,
    want: books.filter(b => b.status === 'want').length,
  }), [books]);

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const idx = new Map(books.map((b, i) => [b.id, i]));
    const list = books.filter(b =>
      (status === 'all' || b.status === status) &&
      (!shelf || b.shelf === shelf) &&
      (!format || b.format === format) &&
      (!rating || b.rating === rating) &&
      (!needle || `${b.title} ${b.author} ${b.tags.join(' ')} ${b.notes}`.toLowerCase().includes(needle)),
    );
    const sign = dir === 'asc' ? 1 : -1;
    return list.sort((a, b) => {
      switch (sort) {
        case 'title': return sign * a.title.localeCompare(b.title);
        case 'author': return sign * (a.author || '~').localeCompare(b.author || '~');
        case 'rating': return sign * (a.rating - b.rating) || idx.get(a.id)! - idx.get(b.id)!;
        default: {
          // dated books first (by date), undated ones keep their stored order
          if (a.finishedAt && b.finishedAt) return sign * a.finishedAt.localeCompare(b.finishedAt) || idx.get(a.id)! - idx.get(b.id)!;
          if (a.finishedAt) return -1;
          if (b.finishedAt) return 1;
          return idx.get(a.id)! - idx.get(b.id)!;
        }
      }
    });
  }, [books, q, status, shelf, format, rating, sort, dir]);

  const filtered = q || shelf || format || rating || status !== 'all';
  const clearFilters = () => { setQ(''); setShelf(''); setFormat(''); setRating(0); setStatus('all'); };

  const onSort = (k: SortKey) => {
    if (k === sort) setDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSort(k); setDir(k === 'title' || k === 'author' ? 'asc' : 'desc'); }
  };

  const save = (b: Book) => {
    const isNew = !books.some(x => x.id === b.id);
    lib.save(b);
    setDialog(null);
    say(isNew ? `Added “${b.title}”` : 'Saved');
  };

  const remove = (b: Book) => {
    const index = books.findIndex(x => x.id === b.id);
    lib.remove(b.id);
    setDialog(null);
    say(`Deleted “${b.title}”`, () => { lib.restore(b, index); setToast(null); });
  };

  const exportJson = () => download('shelf-books.json', JSON.stringify(books, null, 2), 'application/json');
  const exportCsv = () => download('shelf-books.csv', toCsv(books), 'text/csv');

  const importFile = async (file: File) => {
    try {
      const text = await file.text();
      let incoming: Book[];
      if (file.name.toLowerCase().endsWith('.csv')) incoming = fromCsv(text);
      else {
        const data = JSON.parse(text);
        if (!Array.isArray(data)) throw new Error('Expected a list of books');
        const base = emptyBook();
        incoming = data.filter((d: any) => d && typeof d.title === 'string' && d.title.trim()).map((d: any) => ({ ...base, ...d, id: crypto.randomUUID(), tags: Array.isArray(d.tags) ? d.tags : [] }));
      }
      const key = (b: Book) => `${b.title}|${b.author}`.toLowerCase();
      const have = new Set(books.map(key));
      const fresh = incoming.filter(b => !have.has(key(b)) && have.add(key(b)));
      lib.addMany(fresh);
      say(`Imported ${fresh.length} book${fresh.length === 1 ? '' : 's'}${incoming.length > fresh.length ? `, skipped ${incoming.length - fresh.length} duplicate${incoming.length - fresh.length === 1 ? '' : 's'}` : ''}`);
    } catch (e: any) {
      say(`Import failed: ${e.message ?? 'unreadable file'}`);
    }
  };

  const fetchCovers = async () => {
    const todo = books.filter(b => !b.coverUrl);
    if (!todo.length) return say('Every book already has a cover');
    cancelCovers.current = false;
    let found = 0;
    for (let i = 0; i < todo.length; i++) {
      if (cancelCovers.current) break;
      setCoverJob({ done: i, total: todo.length });
      try {
        const [hit] = await searchOpenLibrary(todo[i].title, todo[i].author, 1);
        if (hit?.coverUrl) { lib.save({ ...todo[i], coverUrl: hit.coverUrl, pages: todo[i].pages ?? hit.pages ?? null, isbn: todo[i].isbn || hit.isbn || '' }); found++; }
      } catch {
        setCoverJob(null);
        return say(found ? `Stopped: lost connection after ${found} covers` : 'Could not reach Open Library. Check your connection.');
      }
      await new Promise(r => setTimeout(r, 400)); // be polite to the free API
    }
    setCoverJob(null);
    say(`Found ${found} cover${found === 1 ? '' : 's'}`);
  };

  const menuItem = 'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm hover:bg-accent-soft';

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-2 px-4 py-3 sm:gap-3">
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-accent text-accent-ink"><BookOpen size={18} /></span>
            <h1 className="hidden font-serif text-xl font-bold min-[420px]:block">Shelf</h1>
          </div>
          <nav className="ml-2 flex gap-1" aria-label="Sections">
            {([['library', 'Library', Library], ['stats', 'Stats', BarChart3]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setTab(k)} aria-current={tab === k ? 'page' : undefined} aria-label={label} className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${tab === k ? 'bg-accent-soft text-accent' : 'text-muted hover:text-ink'}`}>
                <Icon size={16} /> <span className="hidden sm:inline">{label}</span>
              </button>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <button className="btn btn-primary" onClick={() => setDialog({ book: emptyBook(), isNew: true })}><Plus size={16} /> <span className="hidden sm:inline">Add book</span></button>
            <button className="btn !px-2.5" onClick={() => setDark(d => !d)} aria-label={dark ? 'Switch to light theme' : 'Switch to dark theme'}>{dark ? <Sun size={16} /> : <Moon size={16} />}</button>
            <div className="relative" data-menu>
              <button className="btn !px-2.5" aria-label="Data menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(o => !o)}><MoreHorizontal size={16} /></button>
              {menuOpen && (
                <div className="absolute right-0 mt-2 w-60 rounded-xl border border-line bg-surface p-1.5 shadow-xl">
                  <button className={menuItem} onClick={() => { exportJson(); setMenuOpen(false); }}><Download size={15} /> Export JSON</button>
                  <button className={menuItem} onClick={() => { exportCsv(); setMenuOpen(false); }}><Download size={15} /> Export CSV</button>
                  <button className={menuItem} onClick={() => { fileRef.current?.click(); setMenuOpen(false); }}><Upload size={15} /> Import JSON / CSV / Goodreads</button>
                  <button className={menuItem} onClick={() => { setMenuOpen(false); fetchCovers(); }}><ImageDown size={15} /> Fetch missing covers</button>
                  <hr className="my-1 border-line" />
                  <button className={`${menuItem} text-danger`} onClick={() => { setMenuOpen(false); if (confirm('Replace your whole library with the original 348 sample books? This cannot be undone.')) { lib.resetToSeed(); say('Library reset'); } }}><RotateCcw size={15} /> Reset to original books</button>
                </div>
              )}
              <input ref={fileRef} type="file" accept=".json,.csv,application/json,text/csv" hidden onChange={e => { const f = e.target.files?.[0]; if (f) importFile(f); e.target.value = ''; }} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6">
        {tab === 'stats' ? (
          <Stats books={books} />
        ) : (
          <>
            <div className="mb-4 flex flex-wrap items-center gap-2" role="tablist" aria-label="Status">
              {(['all', 'read', 'reading', 'want'] as const).map(s => (
                <button key={s} role="tab" aria-selected={status === s} onClick={() => setStatus(s)} className={`rounded-full border px-3.5 py-1.5 text-sm font-medium ${status === s ? 'border-transparent bg-accent text-accent-ink' : 'border-line bg-surface hover:border-muted'}`}>
                  {s === 'all' ? 'All' : STATUS_LABEL[s]} <span className="opacity-70">{counts[s]}</span>
                </button>
              ))}
            </div>

            <div className="mb-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto_auto_auto]">
              <label className="relative sm:col-span-2 lg:col-span-1">
                <span className="sr-only">Search</span>
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                <input className="field !pl-9" type="search" placeholder="Search title, author, tag, notes…" value={q} onChange={e => setQ(e.target.value)} />
              </label>
              <select aria-label="Shelf" className="field lg:!w-auto" value={shelf} onChange={e => setShelf(e.target.value)}>
                <option value="">All shelves</option>
                {lib.shelves.map(s => <option key={s}>{s}</option>)}
              </select>
              <select aria-label="Format" className="field lg:!w-auto" value={format} onChange={e => setFormat(e.target.value as Format | '')}>
                <option value="">Any format</option>
                {(Object.keys(FORMAT_LABEL) as Format[]).map(f => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
              </select>
              <select aria-label="Rating" className="field lg:!w-auto" value={rating} onChange={e => setRating(+e.target.value)}>
                <option value={0}>Any rating</option>
                {[5, 4, 3, 2, 1].map(r => <option key={r} value={r}>{r} ★</option>)}
              </select>
              <select aria-label="Sort by" className="field lg:!w-auto" value={sort} onChange={e => onSort(e.target.value as SortKey)}>
                {SORTS.map(s => <option key={s.key} value={s.key}>Sort: {s.label}</option>)}
              </select>
              <div className="flex gap-1">
                <button className="btn flex-1" onClick={() => setDir(d => (d === 'asc' ? 'desc' : 'asc'))} aria-label={`Sort direction: ${dir === 'asc' ? 'ascending' : 'descending'}`}>{dir === 'asc' ? '↑' : '↓'}</button>
                <button className={`btn !px-2.5 ${view === 'grid' ? 'bg-accent-soft' : ''}`} onClick={() => setView('grid')} aria-label="Grid view" aria-pressed={view === 'grid'}><LayoutGrid size={16} /></button>
                <button className={`btn !px-2.5 ${view === 'table' ? 'bg-accent-soft' : ''}`} onClick={() => setView('table')} aria-label="Table view" aria-pressed={view === 'table'}><List size={16} /></button>
              </div>
            </div>

            <p className="mb-3 flex items-center gap-3 text-sm text-muted" aria-live="polite">
              {visible.length} of {books.length} books
              {filtered && <button className="inline-flex items-center gap-1 text-accent hover:underline" onClick={clearFilters}><X size={13} /> Clear filters</button>}
            </p>

            {books.length === 0 ? (
              <div className="rounded-xl border border-dashed border-line py-20 text-center">
                <p className="font-serif text-xl font-bold">Your shelf is empty</p>
                <p className="mt-1 text-sm text-muted">Add your first book, or import a CSV / Goodreads export.</p>
                <button className="btn btn-primary mt-4" onClick={() => setDialog({ book: emptyBook(), isNew: true })}><Plus size={16} /> Add book</button>
              </div>
            ) : visible.length === 0 ? (
              <p className="py-16 text-center text-muted">No books match these filters.</p>
            ) : view === 'grid' ? (
              <div className="grid grid-cols-2 gap-x-2 gap-y-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7">
                {visible.map(b => <BookCard key={b.id} book={b} onOpen={bk => setDialog({ book: bk, isNew: false })} />)}
              </div>
            ) : (
              <BookTable books={visible} sort={sort} dir={dir} onSort={onSort} onOpen={bk => setDialog({ book: bk, isNew: false })} />
            )}
          </>
        )}
      </main>

      {dialog && <BookDialog key={dialog.book.id} initial={dialog.book} isNew={dialog.isNew} shelves={lib.shelves} onSave={save} onDelete={remove} onClose={() => setDialog(null)} />}

      {coverJob && (
        <div className="fixed bottom-4 left-4 z-50 flex items-center gap-3 rounded-xl border border-line bg-surface px-4 py-3 text-sm shadow-xl" role="status">
          Fetching covers… {coverJob.done}/{coverJob.total}
          <button className="btn !py-1" onClick={() => { cancelCovers.current = true; }}>Stop</button>
        </div>
      )}
      {toast && (
        <div className="fixed bottom-4 left-1/2 z-50 flex -translate-x-1/2 items-center gap-3 rounded-xl bg-ink px-4 py-2.5 text-sm text-bg shadow-xl" role="status">
          {toast.msg}
          {toast.undo && <button className="font-semibold underline" onClick={toast.undo}>Undo</button>}
        </div>
      )}
    </div>
  );
}
