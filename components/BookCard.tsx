
import React, { useState } from 'react';
import { Book, BookType, Collection } from '../types';
import { Star, Headphones, BookOpen, Wand2, MessageCircle, FileText, CheckCircle, Trash2, ArrowUpRight, Mic, Search, RefreshCw } from 'lucide-react';
import * as GeminiService from '../services/geminiService';
import { useBookCover } from '../hooks/useBookCover';

interface BookCardProps {
  book: Book;
  onOpenAiTools: (book: Book, mode: 'chat' | 'edit' | 'video' | 'analyze' | 'summary' | 'findCover') => void;
  onOpenDetails: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
}

const BookCard: React.FC<BookCardProps> = ({ book, onOpenAiTools, onOpenDetails, onMarkRead, onDelete }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const { coverUrl, isRealCover, isSearching } = useBookCover(book.title, book.author, book.coverUrl);

  const handleTTS = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!book.summary) return;
    setIsPlaying(true);
    try {
        const duration = await GeminiService.generateSpeech(book.summary);
        setTimeout(() => setIsPlaying(false), duration * 1000);
    } catch (e) {
        setIsPlaying(false);
    }
  };

  return (
    <div 
        onClick={onOpenDetails}
        className="group relative flex flex-col bg-white rounded-3xl transition-all duration-500 hover:shadow-[0_20px_50px_-12px_rgba(0,0,0,0.1)] border border-slate-100 overflow-hidden cursor-pointer h-full">
      
      {/* Cover Area */}
      <div className="relative aspect-[3/4] overflow-hidden bg-slate-50">
        {isSearching && !isRealCover && (
            <div className="absolute inset-0 z-10 flex items-center justify-center bg-slate-50/50 backdrop-blur-sm animate-pulse">
                <Search size={20} className="text-slate-300 animate-bounce" />
            </div>
        )}
        
        <img 
          src={coverUrl} 
          alt={book.title}
          loading="lazy"
          className={`w-full h-full object-cover transition-all duration-1000 group-hover:scale-105 group-hover:rotate-1 ${isRealCover ? 'opacity-100' : 'opacity-40 grayscale-[0.8]'}`}
        />

        {!isRealCover && !isSearching && (
            <button 
                onClick={(e) => { e.stopPropagation(); onOpenAiTools(book, 'findCover'); }}
                className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="bg-white/90 backdrop-blur p-3 rounded-full shadow-lg text-indigo-600 mb-2">
                    <RefreshCw size={20} />
                </div>
                <span className="text-[10px] font-black uppercase text-indigo-600 bg-white/90 px-2 py-1 rounded-md">Caută Copertă Reală</span>
            </button>
        )}
        
        {/* Dynamic Badge */}
        <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-xl shadow-xl flex items-center gap-2 border border-white/50">
                {book.type === BookType.Audiobook ? <Headphones size={12} className="text-indigo-600" /> : <BookOpen size={12} className="text-slate-900" />}
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-800">
                    {book.collection === Collection.Necitite ? 'To Read' : book.type}
                </span>
            </div>
        </div>

        {/* Hover Actions Bar */}
        <div className="absolute inset-x-0 bottom-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform duration-300 z-20">
            <div className="bg-white/95 backdrop-blur-md p-2 rounded-2xl shadow-2xl flex items-center justify-around border border-white">
                 {onMarkRead ? (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onMarkRead(); }}
                        className="p-2.5 text-emerald-500 hover:bg-emerald-50 rounded-xl transition-colors" title="Finalizat">
                        <CheckCircle size={18} />
                    </button>
                 ) : (
                    <button 
                        onClick={(e) => { e.stopPropagation(); onOpenAiTools(book, 'chat'); }}
                        className="p-2.5 text-indigo-600 hover:bg-indigo-50 rounded-xl transition-colors" title="Discută cu Gemini">
                        <MessageCircle size={18} />
                    </button>
                 )}
                 <button 
                    onClick={(e) => { e.stopPropagation(); onOpenAiTools(book, 'summary'); }}
                    className="p-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" title="Generare Insight">
                    <FileText size={18} />
                 </button>
                 <button 
                    onClick={(e) => { e.stopPropagation(); onOpenAiTools(book, 'edit'); }}
                    className="p-2.5 text-slate-600 hover:bg-slate-50 rounded-xl transition-colors" title="Editare Vizuală">
                    <Wand2 size={18} />
                 </button>
            </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="p-6 space-y-3 flex-grow flex flex-col">
        <div className="flex justify-between items-center">
            <span className="text-[10px] font-black font-mono text-slate-300">NR. {book.nr.toString().padStart(3, '0')}</span>
            {book.collection !== Collection.Necitite && (
                <div className="flex items-center gap-1 text-amber-500 bg-amber-50 px-2 py-0.5 rounded-full">
                    <Star size={10} fill="currentColor" />
                    <span className="text-[10px] font-bold">{book.rating || 0}</span>
                </div>
            )}
        </div>
        
        <div className="space-y-1">
            <h3 className="text-base font-black text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{book.title}</h3>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{book.author}</p>
        </div>

        {book.summary && (
            <div className="pt-4 border-t border-slate-50">
                <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-2 font-medium italic">
                    "{book.summary}"
                </p>
                <button 
                    onClick={handleTTS}
                    disabled={isPlaying}
                    className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-indigo-600 hover:text-indigo-700 transition-all mt-3 disabled:opacity-50">
                    <Mic size={12} className={isPlaying ? 'animate-pulse' : ''} />
                    {isPlaying ? 'Reading...' : 'Voice Insight'}
                </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default BookCard;
