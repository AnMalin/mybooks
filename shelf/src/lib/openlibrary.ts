export interface OlResult {
  title: string;
  author: string;
  year?: number;
  pages?: number;
  isbn?: string;
  coverUrl: string;
}

const FIELDS = 'key,title,author_name,first_publish_year,number_of_pages_median,isbn,cover_i';

/** Search Open Library (free, no key). Throws if the network is unavailable. */
export async function searchOpenLibrary(title: string, author = '', limit = 6, signal?: AbortSignal): Promise<OlResult[]> {
  const q = new URLSearchParams({ title, fields: FIELDS, limit: String(limit) });
  if (author) q.set('author', author);
  const res = await fetch(`https://openlibrary.org/search.json?${q}`, { signal });
  if (!res.ok) throw new Error(`Open Library responded ${res.status}`);
  const data = await res.json();
  return (data.docs ?? []).map((d: any): OlResult => ({
    title: d.title,
    author: (d.author_name ?? [])[0] ?? '',
    year: d.first_publish_year,
    pages: d.number_of_pages_median,
    isbn: (d.isbn ?? [])[0],
    coverUrl: d.cover_i ? `https://covers.openlibrary.org/b/id/${d.cover_i}-M.jpg` : '',
  }));
}
