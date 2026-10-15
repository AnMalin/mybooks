import { useEffect, useState } from 'react';
import { Headphones } from 'lucide-react';
import { Book } from '../types';

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

const GRADIENTS = [
  ['#4f46e5', '#7c3aed'], ['#db2777', '#f59e0b'], ['#0891b2', '#2563eb'], ['#059669', '#0d9488'],
  ['#ea580c', '#dc2626'], ['#7c3aed', '#db2777'], ['#334155', '#0f172a'], ['#ca8a04', '#ea580c'],
];

/** Real cover when we have one, otherwise a bold typographic cover generated from the title. */
export default function Cover({ book, className = '' }: { book: Book; className?: string }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [book.coverUrl]);
  const [from, to] = GRADIENTS[hash(book.title + book.author) % GRADIENTS.length];
  const showImg = book.coverUrl && !failed;

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-xl bg-line shadow-md ring-1 ring-black/5 ${className}`} style={{ containerType: 'inline-size' }}>
      {showImg ? (
        <img src={book.coverUrl} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div className="relative flex h-full w-full flex-col justify-between p-[9%] text-white" style={{ background: `linear-gradient(160deg, ${from}, ${to})` }}>
          <span className="pointer-events-none absolute -right-[30%] -top-[20%] aspect-square w-[85%] rounded-full bg-white/10" />
          <span className="pointer-events-none absolute -bottom-[25%] -left-[25%] aspect-square w-[70%] rounded-full bg-black/10" />
          <div className="relative h-1 w-[18%] rounded-full bg-white/70" />
          <div className="relative">
            <p className="line-clamp-4 font-extrabold leading-[1.05] tracking-tight" style={{ fontSize: 'clamp(0.75rem, 9.5cqw, 1.35rem)' }}>{book.title}</p>
            {book.author && <p className="mt-1.5 line-clamp-2 text-[clamp(0.5rem,5cqw,0.7rem)] font-medium uppercase tracking-widest opacity-80">{book.author}</p>}
          </div>
        </div>
      )}
      {book.format === 'audiobook' && (
        <span className="absolute right-1.5 top-1.5 rounded-full bg-black/55 p-1.5 text-white backdrop-blur" title="Audiobook">
          <Headphones size={12} />
        </span>
      )}
    </div>
  );
}
