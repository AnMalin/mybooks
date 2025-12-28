
import React, { useState } from 'react';
import { Book, BookType, Collection } from '../types';
import { Star, Headphones, BookOpen, Wand2, Play, ScanEye, Calendar, Mic, FileText, CheckCircle, Trash2 } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import { useBookCover } from '../hooks/useBookCover';

interface BookRowProps {
  book: Book;
  onOpenAiTools: (book: Book, mode: 'chat' | 'edit' | 'video' | 'analyze' | 'summary') => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
}

const BookRow: React.FC<BookRowProps> = ({ book, onOpenAiTools, onMarkRead, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { coverUrl } = useBookCover(book.title, book.author, book.coverUrl);

  const handleTTS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!book.summary) return;
    setIsPlaying(true);
    try {
        // Updated to use duration returned by the fixed speech service
        const duration = await GeminiService.generateSpeech(book.summary);
        setTimeout(() => setIsPlaying(false), duration * 1000);
    } catch (e) {
        console.error(e);
        setIsPlaying(false);
    }
  };

  return (
    <div className="group bg-white rounded-xl p-3 border border-slate-100 hover:border-purple-200 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 flex items-center gap-4 cursor-default">
      {/* Index Number */}
      <div className="w-8 text-center text-xs font-mono text-slate-300 font-semibold group-hover:text-purple-400 transition-colors">
        #{book.nr}
      </div>

      {/* Small Cover */}
      <div className="relative h-16 w-12 flex-shrink-0 rounded-md overflow-hidden bg-slate-200 shadow-sm group-hover:shadow-md transition-shadow">
        <img 
          src={coverUrl} 
          alt={book.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
      </div>

      {/* Info */}
      <div className="flex-grow min-w-0 flex flex-col justify-center">
        <div className="flex items-center gap-2 mb-0.5">
             <h3 className="text-sm font-bold text-slate-800 truncate group-hover:text-purple-700 transition-colors">{book.title}</h3>
             <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${book.collection === Collection.Necitite ? 'bg-slate-50 text-slate-500' : (book.type === BookType.Audiobook ? 'bg-purple-50 text-purple-700' : 'bg-blue-50 text-blue-700')}`}>
                {book.type === BookType.Audiobook ? <Headphones size={8} /> : <BookOpen size={8} />}
                {book.collection === Collection.Necitite ? 'Necitită' : (book.type === BookType.Audiobook ? 'Audio' : 'Carte')}
             </span>
        </div>
        <p className="text-xs text-slate-500 truncate">{book.author}</p>
      </div>

      {/* Rating & Date */}
      {book.collection !== Collection.Necitite ? (
        <div className="hidden sm:flex flex-col items-end gap-1 w-32 flex-shrink-0">
            <div className="flex text-amber-400">
                {[...Array(5)].map((_, i) => (
                    <Star key={i} size={12} fill={i < book.rating ? "currentColor" : "none"} className={i < book.rating ? "" : "text-slate-200"} />
                ))}
            </div>
            {book.dateFinished && (
                <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
                    <Calendar size={10} />
                    <span>{book.dateFinished}</span>
                </div>
            )}
        </div>
      ) : (
          <div className="hidden sm:block w-32 flex-shrink-0 text-right">
             <button 
                onClick={onMarkRead}
                className="text-[10px] font-bold text-indigo-500 hover:text-indigo-600 transition-colors">
                Marchează ca citită
             </button>
          </div>
      )}

      {/* Quick Actions (Hover) */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 px-2 border-l border-slate-100 ml-2">
        {onMarkRead && (
             <button onClick={onMarkRead} className="p-2 hover:bg-green-50 rounded-lg text-green-500 transition-colors" title="Am terminat cartea">
                <CheckCircle size={16} />
            </button>
        )}
        {onDelete && (
             <button onClick={onDelete} className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-500 transition-colors" title="Șterge">
                <Trash2 size={16} />
            </button>
        )}
        <button onClick={() => onOpenAiTools(book, 'chat')} className="p-2 hover:bg-purple-50 rounded-lg text-slate-400 hover:text-purple-600 transition-colors" title="Discută">
            <ScanEye size={16} />
        </button>
         <button onClick={() => onOpenAiTools(book, 'summary')} className="p-2 hover:bg-indigo-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-colors" title="Generează Rezumat">
            <FileText size={16} />
        </button>
      </div>
    </div>
  );
};

export default BookRow;
