import { useCallback, useEffect, useMemo, useState } from 'react';
import { Book } from './types';
import seed from './data/seed.json';

const KEY = 'shelf.books.v1';

function load(): Book[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as Book[];
  } catch {
    /* fall through to seed */
  }
  return seed as Book[];
}

/** Library state, persisted to localStorage on every change. */
export function useLibrary() {
  const [books, setBooks] = useState<Book[]>(load);

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(books));
    } catch {
      /* storage full or blocked: keep working in memory */
    }
  }, [books]);

  const save = useCallback((b: Book) => {
    setBooks(prev => (prev.some(x => x.id === b.id) ? prev.map(x => (x.id === b.id ? b : x)) : [b, ...prev]));
  }, []);
  const patch = useCallback((id: string, changes: Partial<Book> | ((b: Book) => Partial<Book>)) => {
    setBooks(prev => prev.map(x => (x.id === id ? { ...x, ...(typeof changes === 'function' ? changes(x) : changes) } : x)));
  }, []);
  const remove = useCallback((id: string) => setBooks(prev => prev.filter(x => x.id !== id)), []);
  const restore = useCallback((b: Book, index: number) => {
    setBooks(prev => (prev.some(x => x.id === b.id) ? prev : [...prev.slice(0, index), b, ...prev.slice(index)]));
  }, []);
  const addMany = useCallback((list: Book[]) => setBooks(prev => [...list, ...prev]), []);
  const replaceAll = useCallback((list: Book[]) => setBooks(list), []);
  const resetToSeed = useCallback(() => setBooks(seed as Book[]), []);

  const shelves = useMemo(() => [...new Set(books.map(b => b.shelf).filter(Boolean))].sort(), [books]);

  return { books, save, patch, remove, restore, addMany, replaceAll, resetToSeed, shelves };
}
