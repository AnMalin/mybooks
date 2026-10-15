import { ArrowDown, ArrowUp, Headphones } from 'lucide-react';
import { Book, STATUS_LABEL } from '../types';
import { fmtDate } from '../lib/dates';
import Stars from './Stars';

export type SortKey = 'latest' | 'title' | 'author' | 'rating';

interface Props {
  books: Book[];
  sort: SortKey;
  dir: 'asc' | 'desc';
  onSort: (k: SortKey) => void;
  onOpen: (b: Book) => void;
}

export default function BookTable({ books, sort, dir, onSort, onOpen }: Props) {
  const Th = ({ k, children, className = '' }: { k?: SortKey; children: React.ReactNode; className?: string }) => (
    <th scope="col" className={`px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-muted ${className}`} aria-sort={k && sort === k ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}>
      {k ? (
        <button className="inline-flex items-center gap-1 hover:text-ink" onClick={() => onSort(k)}>
          {children}
          {sort === k && (dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />)}
        </button>
      ) : children}
    </th>
  );

  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface">
      <table className="w-full min-w-[640px] text-sm">
        <thead className="border-b border-line">
          <tr>
            <Th k="title">Title</Th>
            <Th k="author">Author</Th>
            <Th className="hidden md:table-cell">Shelf</Th>
            <Th k="rating">Rating</Th>
            <Th k="latest">Finished</Th>
          </tr>
        </thead>
        <tbody>
          {books.map(b => (
            <tr key={b.id} tabIndex={0} onClick={() => onOpen(b)} onKeyDown={e => e.key === 'Enter' && onOpen(b)} className="cursor-pointer border-b border-line last:border-0 hover:bg-accent-soft">
              <td className="max-w-[22rem] px-3 py-2 font-serif font-semibold">
                <span className="line-clamp-1">
                  {b.format === 'audiobook' && <Headphones size={13} className="mr-1.5 inline text-muted" aria-label="Audiobook" />}
                  {b.title}
                </span>
              </td>
              <td className="max-w-[14rem] truncate px-3 py-2 text-muted">{b.author}</td>
              <td className="hidden px-3 py-2 text-muted md:table-cell">{b.shelf}</td>
              <td className="px-3 py-2">{b.status === 'read' ? <Stars value={b.rating} /> : <span className="text-xs text-muted">{STATUS_LABEL[b.status]}</span>}</td>
              <td className="whitespace-nowrap px-3 py-2 text-muted">{fmtDate(b.finishedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
