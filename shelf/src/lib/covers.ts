import { searchOpenLibrary } from './openlibrary';

export interface CoverHit {
  coverUrl: string;
  pages?: number;
  isbn?: string;
}

const clean = (s: string) => s.replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim();

/** Google Books: free without a key for light use; good fallback for non-English titles. */
async function googleBooks(title: string, author: string, signal?: AbortSignal): Promise<CoverHit | null> {
  const q = `intitle:${clean(title)}${author ? `+inauthor:${clean(author.split(',')[0])}` : ''}`;
  const res = await fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(q).replace(/%2B/g, '+')}&maxResults=3&printType=books&fields=items(volumeInfo(title,pageCount,imageLinks,industryIdentifiers))`, { signal });
  if (!res.ok) throw new Error(`Google Books responded ${res.status}`);
  const data = await res.json();
  for (const it of data.items ?? []) {
    const links = it.volumeInfo?.imageLinks;
    const raw: string | undefined = links?.thumbnail ?? links?.smallThumbnail;
    if (!raw) continue;
    const isbn = (it.volumeInfo.industryIdentifiers ?? []).find((i: any) => i.type === 'ISBN_13')?.identifier;
    return { coverUrl: raw.replace(/^http:/, 'https:').replace('&edge=curl', ''), pages: it.volumeInfo.pageCount || undefined, isbn };
  }
  return null;
}

/**
 * Looks for a cover: Open Library first, then Google Books.
 * Returns null when nothing was found; THROWS when the network/service is unavailable
 * (so callers can retry later instead of remembering a false "not found").
 */
export async function findCover(title: string, author: string, signal?: AbortSignal): Promise<CoverHit | null> {
  const t = clean(title);
  let netErr: unknown = null;
  try {
    let hits = await searchOpenLibrary(t, author, 3, signal);
    if (!hits.some(h => h.coverUrl) && author) hits = await searchOpenLibrary(t, '', 3, signal);
    const hit = hits.find(h => h.coverUrl);
    if (hit) return { coverUrl: hit.coverUrl, pages: hit.pages, isbn: hit.isbn };
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    netErr = e;
  }
  try {
    return await googleBooks(t, author, signal);
  } catch (e) {
    if ((e as Error).name === 'AbortError') throw e;
    if (netErr) throw e; // both sources failed → service/network problem, not "no cover"
    return null;
  }
}

/** Small shared queue: max 2 requests in flight, spaced out, backs off after failures. */
type Job = { run: () => Promise<void> };
const queue: Job[] = [];
const queued = new Set<string>();
let active = 0;
let pausedUntil = 0;

const pump = () => {
  if (active >= 2 || !queue.length) return;
  const wait = pausedUntil - Date.now();
  if (wait > 0) { setTimeout(pump, wait); return; }
  const job = queue.shift()!;
  active++;
  job.run().finally(() => {
    active--;
    setTimeout(pump, 350);
  });
  pump();
};

/** Queue a lookup. `done(null)` means "really not found"; `onFail` means "try again later". */
export function enqueueCover(id: string, title: string, author: string, done: (hit: CoverHit | null) => void, onFail?: () => void) {
  if (queued.has(id)) return;
  queued.add(id);
  queue.push({
    run: async () => {
      try {
        done(await findCover(title, author));
      } catch {
        pausedUntil = Date.now() + 30_000; // offline or rate limited: stop hammering for 30s
        onFail?.();
      } finally {
        queued.delete(id);
      }
    },
  });
  pump();
}

/** Drop everything still waiting (used by the Stop button). */
export function clearCoverQueue() {
  queue.length = 0;
  queued.clear();
}
