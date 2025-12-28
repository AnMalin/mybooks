
import React from 'react';
import { Book, BookType, Collection } from '../types';
import { Star, Headphones, BookOpen, Wand2, Play, ScanEye, Mic, ArrowUp, ArrowDown, ArrowUpDown, FileText, CheckCircle, Trash2, Sparkles } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import { useBookCover } from '../hooks/useBookCover';

interface TableRowProps {
  book: Book;
  onUpdate: (id: string, field: keyof Book, value: any) => void;
  onOpenAiTools: (book: Book, mode: 'chat' | 'edit' | 'video' | 'analyze' | 'summary') => void;
  onMarkRead?: (book: Book) => void;
  onDelete?: (book: Book) => void;
}

const TableRow: React.FC<TableRowProps> = ({ book, onUpdate, onOpenAiTools, onMarkRead, onDelete }) => {
  const { coverUrl } = useBookCover(book.title, book.author, book.coverUrl);
  
  return (
    <tr className="group border-b border-slate-50 hover:bg-slate-50/50 transition-colors">
      <td className="px-6 py-4 text-[10px] font-black font-mono text-slate-300">
        #{book.nr.toString().padStart(3, '0')}
      </td>

      <td className="px-6 py-4">
        <div className="h-12 w-9 rounded-md overflow-hidden bg-slate-100 shadow-sm">
          <img src={coverUrl} alt="" className="h-full w-full object-cover" />
        </div>
      </td>

      <td className="px-6 py-4 min-w-[200px]">
        <input 
          type="text" 
          value={book.title}
          onChange={(e) => onUpdate(book.id, 'title', e.target.value)}
          className="w-full bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 -ml-1 text-sm font-black text-slate-900 placeholder-slate-300 transition-all"
        />
      </td>

      <td className="px-6 py-4">
        <input 
          type="text" 
          value={book.author}
          onChange={(e) => onUpdate(book.id, 'author', e.target.value)}
          className="w-full bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 -ml-1 text-xs font-bold text-slate-400 uppercase tracking-widest placeholder-slate-200 transition-all"
        />
      </td>

      <td className="px-6 py-4">
        {book.collection === Collection.Necitite ? (
             <span className="text-[9px] uppercase tracking-widest font-black text-slate-300 px-2 py-1 bg-slate-50 rounded-md">Necitită</span>
        ) : (
            <select 
                value={book.type}
                onChange={(e) => onUpdate(book.id, 'type', e.target.value)}
                className="bg-transparent text-[10px] font-black uppercase tracking-widest border-none focus:ring-0 text-slate-500 cursor-pointer p-0"
            >
                <option value={BookType.Book}>Book</option>
                <option value={BookType.Audiobook}>Audio</option>
            </select>
        )}
      </td>

      <td className="px-6 py-4">
        <div className="flex items-center gap-0.5 group/stars">
            {[1, 2, 3, 4, 5].map((star) => (
                <button
                    key={star}
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      onUpdate(book.id, 'rating', star);
                    }}
                    className="focus:outline-none p-0.5 transition-transform active:scale-90"
                >
                    <Star 
                        size={16} 
                        fill={star <= (book.rating || 0) ? "#fbbf24" : "none"} 
                        className={`${star <= (book.rating || 0) ? "text-amber-400" : "text-slate-200"} hover:text-amber-300 hover:scale-125 transition-all`} 
                    />
                </button>
            ))}
        </div>
      </td>

      <td className="px-6 py-4">
         <input 
          type="text" 
          value={book.dateFinished || ''}
          placeholder={book.collection === Collection.Necitite ? "-" : "dd.mm.yyyy"}
          onChange={(e) => onUpdate(book.id, 'dateFinished', e.target.value)}
          className="w-24 bg-transparent border-none focus:ring-2 focus:ring-indigo-100 rounded px-1 -ml-1 text-xs font-bold text-slate-500 placeholder-slate-200 transition-all"
        />
      </td>

      <td className="px-6 py-4 text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {book.collection === Collection.Necitite && onMarkRead && (
                 <button onClick={() => onMarkRead(book)} className="p-2 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-all" title="Am citit-o!"><CheckCircle size={16}/></button>
            )}
            {book.collection === Collection.Necitite && onDelete && (
                 <button onClick={() => onDelete(book)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all" title="Șterge"><Trash2 size={16}/></button>
            )}
            <button onClick={() => onOpenAiTools(book, 'chat')} className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all" title="Analiză Gemini"><Sparkles size={16}/></button>
        </div>
      </td>
    </tr>
  );
};

interface BookTableProps {
  books: Book[];
  onUpdate: (id: string, field: keyof Book, value: any) => void;
  onOpenAiTools: (book: Book, mode: 'chat' | 'edit' | 'video' | 'analyze' | 'summary') => void;
  onSort: (field: keyof Book) => void;
  sortField: keyof Book;
  sortDirection: 'asc' | 'desc';
  onMarkRead?: (book: Book) => void;
  onDelete?: (book: Book) => void;
}

const BookTable: React.FC<BookTableProps> = ({ books, onUpdate, onOpenAiTools, onSort, sortField, sortDirection, onMarkRead, onDelete }) => {
    
    const SortHeader = ({ field, label, width }: { field: keyof Book, label: string, width?: string }) => (
        <th 
            className={`px-6 py-4 cursor-pointer hover:bg-slate-100/50 transition-colors select-none ${width || ''}`}
            onClick={() => onSort(field)}
        >
            <div className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400`}>
                {label}
                {sortField === field && (
                    sortDirection === 'asc' ? <ArrowUp size={12} className="text-indigo-600"/> : <ArrowDown size={12} className="text-indigo-600"/>
                )}
            </div>
        </th>
    );

    return (
        <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden mb-10">
            <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-100">
                            <SortHeader field="nr" label="#" width="w-20" />
                            <th className="px-6 py-4 w-20 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Cover</th>
                            <SortHeader field="title" label="Titlu" />
                            <SortHeader field="author" label="Autor" />
                            <SortHeader field="type" label="Format" width="w-32" />
                            <SortHeader field="rating" label="Rating" width="w-40" />
                            <SortHeader field="dateFinished" label="Finalizat" width="w-32" />
                            <th className="px-6 py-4 w-24 text-right text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Tools</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50">
                        {books.map(book => (
                            <TableRow key={book.id} book={book} onUpdate={onUpdate} onOpenAiTools={onOpenAiTools} onMarkRead={onMarkRead} onDelete={onDelete} />
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default BookTable;
