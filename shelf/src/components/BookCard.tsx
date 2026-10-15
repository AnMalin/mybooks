import { Book, STATUS_LABEL } from '../types';
import Cover from './Cover';
import Stars from './Stars';

export default function BookCard({ book, onOpen }: { book: Book; onOpen: (b: Book) => void }) {
  return (
    <button onClick={() => onOpen(book)} className="group flex flex-col gap-2 rounded-lg p-2 text-left transition hover:bg-surface hover:shadow-md" style={{ containerType: 'inline-size' }}>
      <Cover book={book} className="transition group-hover:-translate-y-0.5" />
      <div className="min-w-0 px-0.5">
        <p className="line-clamp-2 font-serif text-sm font-semibold leading-snug">{book.title}</p>
        <p className="truncate text-xs text-muted">{book.author || 'Unknown author'}</p>
        <div className="mt-1 flex items-center justify-between gap-1">
          {book.status === 'read' ? <Stars value={book.rating} size={12} /> : <span className="rounded bg-accent-soft px-1.5 py-0.5 text-[0.65rem] font-medium text-accent">{STATUS_LABEL[book.status]}</span>}
        </div>
      </div>
    </button>
  );
}
