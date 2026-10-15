import { useState } from 'react';
import { Headphones } from 'lucide-react';
import { Book } from '../types';

const hash = (s: string) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);

/** Real cover when we have one, otherwise a typographic cover generated from the title. */
export default function Cover({ book, className = '' }: { book: Book; className?: string }) {
  const [failed, setFailed] = useState(false);
  const h = hash(book.title + book.author);
  const hue = (h % 40) + 18; // warm range: ochre → rust → brown
  const sat = 35 + (h % 25);

  return (
    <div className={`relative aspect-[2/3] overflow-hidden rounded-md shadow-sm ring-1 ring-black/10 ${className}`}>
      {book.coverUrl && !failed ? (
        <img src={book.coverUrl} alt="" loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full flex-col justify-between p-[9%] text-white"
          style={{ background: `linear-gradient(155deg, hsl(${hue} ${sat}% 38%), hsl(${hue + 12} ${sat}% 24%))` }}
        >
          <div className="h-px w-1/3 bg-white/50" />
          <div>
            <p className="line-clamp-4 font-serif font-bold leading-tight" style={{ fontSize: 'clamp(0.7rem, 8.5cqw, 1.2rem)' }}>{book.title}</p>
            {book.author && <p className="mt-1 line-clamp-2 text-[0.6rem] uppercase tracking-wider opacity-75">{book.author}</p>}
          </div>
        </div>
      )}
      {book.format === 'audiobook' && (
        <span className="absolute right-1 top-1 rounded-full bg-black/65 p-1 text-white" title="Audiobook">
          <Headphones size={12} />
        </span>
      )}
    </div>
  );
}
