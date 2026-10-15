import { useEffect, useRef } from 'react';
import { Book, STATUS_LABEL } from '../types';
import Cover from './Cover';
import Stars from './Stars';

interface Props {
  book: Book;
  onOpen: (b: Book) => void;
  /** Called once when a book without a cover scrolls into view. */
  onNeedCover?: (b: Book) => void;
}

export default function BookCard({ book, onOpen, onNeedCover }: Props) {
  const ref = useRef<HTMLButtonElement>(null);
  const needs = !book.coverUrl && !!onNeedCover;

  useEffect(() => {
    if (!needs || !ref.current || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(entries => {
      if (entries.some(e => e.isIntersecting)) { onNeedCover!(book); io.disconnect(); }
    }, { rootMargin: '250px' });
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [needs, book.id]);

  return (
    <button ref={ref} onClick={() => onOpen(book)} className="group flex flex-col gap-2.5 rounded-2xl p-1.5 text-left outline-offset-0">
      <div className="relative">
        <Cover book={book} className="transition duration-300 group-hover:-translate-y-1 group-hover:shadow-2xl" />
        {book.status !== 'read' && (
          <span className="absolute bottom-2 left-2 rounded-full bg-black/60 px-2 py-0.5 text-[0.65rem] font-semibold uppercase tracking-wide text-white backdrop-blur">{STATUS_LABEL[book.status]}</span>
        )}
      </div>
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 text-sm font-semibold leading-snug tracking-tight">{book.title}</p>
        <p className="mt-0.5 truncate text-xs text-muted">{book.author || 'Unknown author'}</p>
        {book.status === 'read' && <div className="mt-1.5"><Stars value={book.rating} size={12} /></div>}
      </div>
    </button>
  );
}
