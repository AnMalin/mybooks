
import { createClient } from '@supabase/supabase-js';
import { Book } from '../types';

// Credentials provided by user
const supabaseUrl = 'https://aupawysfgimuftikwlfz.supabase.co';
const supabaseAnonKey = 'sb_publishable_HBBaV_92ZZpvOttm4wPjtw_QaXinown';

// Validation
const isSupabaseConfigured = supabaseUrl && 
                             supabaseAnonKey && 
                             !supabaseUrl.includes('process.env') &&
                             supabaseUrl.startsWith('https://');

export const supabase = isSupabaseConfigured ? createClient(supabaseUrl, supabaseAnonKey) : null;

const localDB = {
  get: (): Book[] => {
    const data = localStorage.getItem('my_reading_journey_books');
    return data ? JSON.parse(data) : [];
  },
  save: (books: Book[]) => {
    localStorage.setItem('my_reading_journey_books', JSON.stringify(books));
  }
};

const formatSupabaseError = (error: any) => {
  return `Code: ${error.code} | Message: ${error.message} | Details: ${error.details || 'None'} | Hint: ${error.hint || 'None'}`;
};

export const SQL_CREATE_TABLE = `
-- Script de configurare completa pentru Supabase
-- Ruleaza acest script in SQL Editor pentru a activa baza de date

-- 1. Crearea tabelului
CREATE TABLE IF NOT EXISTS public.books (
  id TEXT PRIMARY KEY,
  nr INTEGER,
  title TEXT NOT NULL,
  author TEXT,
  type TEXT DEFAULT 'Book',
  rating REAL DEFAULT 0,
  "dateFinished" TEXT,
  summary TEXT,
  collection TEXT,
  "coverUrl" TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Activarea Row Level Security
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;

-- 3. Politica de acces public (permite cheii anon sa faca operatiuni)
DROP POLICY IF EXISTS "Public Access" ON public.books;
CREATE POLICY "Public Access" 
ON public.books 
FOR ALL 
TO anon 
USING (true) 
WITH CHECK (true);

-- 4. Index pentru performanta
CREATE INDEX IF NOT EXISTS idx_books_collection ON public.books(collection);
`.trim();

export const bookService = {
  async fetchBooks(): Promise<Book[]> {
    if (!supabase) {
      console.warn('Supabase not configured. Using LocalStorage.');
      return localDB.get();
    }

    try {
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('nr', { ascending: false });

      if (error) {
        if (error.code === '42P01' || error.code === 'PGRST205') {
          console.error('DATABASE TABLE MISSING OR CACHE STALE.');
        }
        throw error;
      }
      return data || [];
    } catch (error: any) {
      console.error('Supabase fetch error:', formatSupabaseError(error));
      const local = localDB.get();
      if (local.length > 0) return local;
      throw error;
    }
  },

  async updateBook(id: string, updates: Partial<Book>) {
    const books = localDB.get();
    const updated = books.map(b => b.id === id ? { ...b, ...updates } : b);
    localDB.save(updated);

    if (supabase) {
      const { error } = await supabase.from('books').update(updates).eq('id', id);
      if (error) console.error('Cloud update failed, saved locally:', formatSupabaseError(error));
    }
  },

  async deleteBook(id: string) {
    const books = localDB.get();
    localDB.save(books.filter(b => b.id !== id));

    if (supabase) {
      const { error } = await supabase.from('books').delete().eq('id', id);
      if (error) console.error('Cloud delete failed, removed locally:', formatSupabaseError(error));
    }
  },

  async seedDatabase(books: Book[]) {
    // Always seed local storage
    if (localDB.get().length === 0) localDB.save(books);

    if (!supabase) return;

    try {
      const { error } = await supabase.from('books').upsert(books, { onConflict: 'id' });
      if (error) throw error;
      console.log('Database seeded successfully.');
    } catch (error: any) {
      console.error('Seeding failed:', formatSupabaseError(error));
      throw error;
    }
  }
};
