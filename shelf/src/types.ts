export type Format = 'book' | 'audiobook';
export type Status = 'read' | 'reading' | 'want';

export interface Book {
  id: string;
  title: string;
  author: string;
  format: Format;
  status: Status;
  rating: number; // 0 = unrated, 1-5
  finishedAt: string | null; // YYYY-MM-DD
  notes: string;
  shelf: string; // free text, e.g. a place or collection
  tags: string[];
  coverUrl: string;
  isbn: string;
  pages: number | null;
  addedAt: string | null; // ISO timestamp
}

export const STATUS_LABEL: Record<Status, string> = {
  read: 'Read',
  reading: 'Reading',
  want: 'To read',
};

export const FORMAT_LABEL: Record<Format, string> = {
  book: 'Book',
  audiobook: 'Audiobook',
};

export const emptyBook = (): Book => ({
  id: crypto.randomUUID(),
  title: '',
  author: '',
  format: 'book',
  status: 'want',
  rating: 0,
  finishedAt: null,
  notes: '',
  shelf: '',
  tags: [],
  coverUrl: '',
  isbn: '',
  pages: null,
  addedAt: new Date().toISOString(),
});
