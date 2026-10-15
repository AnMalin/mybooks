import { FormEvent, useEffect, useRef, useState } from 'react';
import { Loader2, Search, Trash2, X } from 'lucide-react';
import { Book, FORMAT_LABEL, Format, STATUS_LABEL, Status } from '../types';
import { OlResult, searchOpenLibrary } from '../lib/openlibrary';
import { todayIso } from '../lib/dates';
import Stars from './Stars';
import Cover from './Cover';

interface Props {
  initial: Book;
  isNew: boolean;
  shelves: string[];
  onSave: (b: Book) => void;
  onDelete: (b: Book) => void;
  onClose: () => void;
}

export default function BookDialog({ initial, isNew, shelves, onSave, onDelete, onClose }: Props) {
  const [b, setB] = useState<Book>(initial);
  const [tags, setTags] = useState(initial.tags.join(', '));
  const [results, setResults] = useState<OlResult[] | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchErr, setSearchErr] = useState('');
  const titleRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    titleRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  const set = <K extends keyof Book>(k: K, v: Book[K]) => setB(prev => ({ ...prev, [k]: v }));

  const setStatus = (status: Status) =>
    setB(prev => ({ ...prev, status, finishedAt: status === 'read' ? prev.finishedAt ?? todayIso() : prev.finishedAt, rating: status === 'want' ? 0 : prev.rating }));

  const lookup = async () => {
    if (!b.title.trim()) return;
    setSearching(true);
    setSearchErr('');
    try {
      setResults(await searchOpenLibrary(b.title.trim(), b.author.trim()));
    } catch {
      setResults(null);
      setSearchErr('Could not reach Open Library. Check your connection and try again.');
    } finally {
      setSearching(false);
    }
  };

  const pick = (r: OlResult) => {
    setB(prev => ({ ...prev, title: r.title || prev.title, author: r.author || prev.author, coverUrl: r.coverUrl || prev.coverUrl, pages: r.pages ?? prev.pages, isbn: r.isbn ?? prev.isbn }));
    setResults(null);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!b.title.trim()) return;
    onSave({ ...b, title: b.title.trim(), author: b.author.trim(), shelf: b.shelf.trim(), tags: tags.split(',').map(t => t.trim()).filter(Boolean) });
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onMouseDown={e => e.target === e.currentTarget && onClose()}>
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={isNew ? 'Add book' : 'Edit book'} className="flex max-h-[95vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-line bg-bg shadow-2xl sm:rounded-3xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-3">
          <h2 className="text-lg font-semibold">{isNew ? 'Add a book' : 'Edit book'}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded p-1 hover:bg-line"><X size={18} /></button>
        </header>

        <div className="grid gap-4 overflow-y-auto p-5 sm:grid-cols-[9rem_1fr]">
          <div className="hidden sm:block"><Cover book={b} /></div>
          <div className="grid gap-3">
            <label className="grid gap-1 text-sm font-medium">Title
              <input ref={titleRef} className="field" value={b.title} onChange={e => set('title', e.target.value)} required />
            </label>
            <label className="grid gap-1 text-sm font-medium">Author
              <input className="field" value={b.author} onChange={e => set('author', e.target.value)} />
            </label>
            <div>
              <button type="button" className="btn" onClick={lookup} disabled={!b.title.trim() || searching}>
                {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />} Find cover &amp; details
              </button>
              {searchErr && <p className="mt-2 text-sm text-danger" role="alert">{searchErr}</p>}
              {results && results.length === 0 && <p className="mt-2 text-sm text-muted">No matches found.</p>}
              {results && results.length > 0 && (
                <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-surface">
                  {results.map((r, i) => (
                    <li key={i}>
                      <button type="button" onClick={() => pick(r)} className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-accent-soft">
                        {r.coverUrl ? <img src={r.coverUrl} alt="" className="h-12 w-8 rounded object-cover" /> : <span className="h-12 w-8 rounded bg-line" />}
                        <span className="min-w-0"><span className="block truncate font-medium">{r.title}</span><span className="block truncate text-xs text-muted">{r.author}{r.year ? ` · ${r.year}` : ''}</span></span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
            <label className="grid gap-1 text-sm font-medium">Status
              <select className="field" value={b.status} onChange={e => setStatus(e.target.value as Status)}>
                {(Object.keys(STATUS_LABEL) as Status[]).map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium">Format
              <select className="field" value={b.format} onChange={e => set('format', e.target.value as Format)}>
                {(Object.keys(FORMAT_LABEL) as Format[]).map(f => <option key={f} value={f}>{FORMAT_LABEL[f]}</option>)}
              </select>
            </label>
            {b.status === 'read' && (
              <>
                <label className="grid gap-1 text-sm font-medium">Date finished
                  <input type="date" className="field" value={b.finishedAt ?? ''} onChange={e => set('finishedAt', e.target.value || null)} />
                </label>
                <div className="grid gap-1 text-sm font-medium">Rating
                  <div className="flex h-[2.4rem] items-center"><Stars value={b.rating} onChange={v => set('rating', v)} size={22} /></div>
                </div>
              </>
            )}
            <label className="grid gap-1 text-sm font-medium">Shelf
              <input className="field" list="shelf-list" value={b.shelf} onChange={e => set('shelf', e.target.value)} placeholder="e.g. Bucuresti" />
              <datalist id="shelf-list">{shelves.map(s => <option key={s} value={s} />)}</datalist>
            </label>
            <label className="grid gap-1 text-sm font-medium">Tags
              <input className="field" value={tags} onChange={e => setTags(e.target.value)} placeholder="comma, separated" />
            </label>
            <label className="grid gap-1 text-sm font-medium">ISBN
              <input className="field" value={b.isbn} onChange={e => set('isbn', e.target.value)} />
            </label>
            <label className="grid gap-1 text-sm font-medium">Pages
              <input type="number" min={1} className="field" value={b.pages ?? ''} onChange={e => set('pages', e.target.value ? parseInt(e.target.value, 10) : null)} />
            </label>
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">Cover image URL
              <input type="url" className="field" value={b.coverUrl} onChange={e => set('coverUrl', e.target.value)} placeholder="https://…" />
            </label>
            <label className="grid gap-1 text-sm font-medium sm:col-span-2">Notes
              <textarea rows={4} className="field" value={b.notes} onChange={e => set('notes', e.target.value)} />
            </label>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-line px-5 py-3">
          {isNew ? <span /> : <button type="button" className="btn btn-danger" onClick={() => onDelete(initial)}><Trash2 size={15} /> Delete</button>}
          <div className="flex gap-2">
            <button type="button" className="btn" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary">{isNew ? 'Add book' : 'Save'}</button>
          </div>
        </footer>
      </form>
    </div>
  );
}
