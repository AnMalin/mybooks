
import React, { useState, useMemo, useEffect } from 'react';
import { ALL_BOOKS } from './constants';
import { Book, Collection, BookType } from './types';
import { bookService } from './services/supabaseService';
import BookCard from './components/BookCard';
import BookRow from './components/BookRow';
import BookTable from './components/BookTable';
import AiSidebar from './components/AiSidebar';
import { 
  Library, Search, LayoutGrid, List, Table as TableIcon, 
  X, Sparkles, Loader2, CloudUpload, Star, 
  Home, MapPin, ArrowRight, CheckCircle, Filter, 
  Headphones, BookOpen, Layers, ArrowUpDown, Calendar, Hash, RefreshCw
} from 'lucide-react';

const App: React.FC = () => {
  const [books, setBooks] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<Collection | 'All'>('All');
  const [viewMode, setViewMode] = useState<'grid' | 'list' | 'table'>('grid');
  const [isUsingSupabase, setIsUsingSupabase] = useState(false);
  
  // Filter & Sort States - Default to most recent first
  const [filterRating, setFilterRating] = useState<number | 'All'>('All');
  const [filterType, setFilterType] = useState<BookType | 'All'>('All');
  const [sortField, setSortField] = useState<keyof Book>('dateFinished');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  
  const [selectedBookForDetails, setSelectedBookForDetails] = useState<Book | null>(null);
  const [bookToMove, setBookToMove] = useState<Book | null>(null);
  
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeBook, setActiveBook] = useState<Book | null>(null);
  const [aiMode, setAiMode] = useState<'chat' | 'edit' | 'video' | 'analyze' | 'summary' | 'findCover'>('chat');

  const fetchAndSetBooks = async () => {
    setIsLoading(true);
    try {
      const data = await bookService.fetchBooks();
      if (data.length === 0) {
        try {
          await bookService.seedDatabase(ALL_BOOKS);
          const seededData = await bookService.fetchBooks();
          setBooks(seededData);
          setIsUsingSupabase(true);
        } catch (seedErr: any) {
          setBooks(ALL_BOOKS);
          setIsUsingSupabase(false);
        }
      } else {
        setBooks(data);
        setIsUsingSupabase(true);
      }
    } catch (error: any) {
      setBooks(ALL_BOOKS);
      setIsUsingSupabase(false);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAndSetBooks();
  }, []);

  const handleUpdateBook = async (id: string, field: keyof Book, value: any) => {
    setBooks(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    try { 
      await bookService.updateBook(id, { [field]: value }); 
    } catch (e) {
      console.error("Failed to update book persistent storage", e);
    }
  };

  // Fix: Added handleDeleteBook to resolve missing reference errors in book rendering lists
  const handleDeleteBook = async (id: string) => {
    setBooks(prev => prev.filter(b => b.id !== id));
    try {
      await bookService.deleteBook(id);
    } catch (e) {
      console.error("Failed to delete book", e);
    }
  };

  const handleSort = (field: keyof Book) => {
    if (sortField === field) {
        setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
        setSortField(field);
        setSortDirection('desc');
    }
  };

  const parseCustomDate = (dateStr?: string) => {
    if (!dateStr || dateStr.trim() === '' || dateStr === '-' || dateStr.toLowerCase().includes('n/a')) return 0;
    const parts = dateStr.split(/[./-]/);
    if (parts.length !== 3) return 0;
    const d = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10) - 1;
    let y = parseInt(parts[2], 10);
    if (y < 100) y += 2000;
    const date = new Date(y, m, d);
    return isNaN(date.getTime()) ? 0 : date.getTime();
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = (book.title || '').toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (book.author || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchesTab = activeTab === 'All' || book.collection === activeTab;
      const matchesRating = filterRating === 'All' || (book.rating || 0) === filterRating;
      const matchesType = filterType === 'All' || book.type === filterType;
      
      return matchesSearch && matchesTab && matchesRating && matchesType;
    }).sort((a, b) => {
        let valA: any;
        let valB: any;

        if (sortField === 'dateFinished') {
            valA = parseCustomDate(a.dateFinished);
            valB = parseCustomDate(b.dateFinished);
            // Put items with no date at the end regardless of direction
            if (valA === 0 && valB !== 0) return 1;
            if (valB === 0 && valA !== 0) return -1;
        } else if (sortField === 'rating' || sortField === 'nr') {
            valA = a[sortField] || 0;
            valB = b[sortField] || 0;
        } else {
            valA = (a[sortField] || '').toString().toLowerCase();
            valB = (b[sortField] || '').toString().toLowerCase();
        }

        if (valA === valB) return 0;
        const comparison = valA < valB ? -1 : 1;
        return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [searchTerm, activeTab, books, sortField, sortDirection, filterRating, filterType]);

  const stats = useMemo(() => {
    const total = books.length;
    const read = books.filter(b => b.collection !== Collection.Necitite).length;
    const rated = books.filter(b => (b.rating || 0) > 0);
    const avgRating = (rated.reduce((acc, curr) => acc + (curr.rating || 0), 0) / (rated.length || 1)).toFixed(1);
    return { total, read, unread: total - read, avgRating };
  }, [books]);

  const handleOpenAi = (book: Book, mode: 'chat' | 'edit' | 'video' | 'analyze' | 'summary' | 'findCover') => {
    setActiveBook(book);
    setAiMode(mode);
    setSidebarOpen(true);
  };

  const findMissingCovers = () => {
    setActiveBook(null);
    setAiMode('findCover');
    setSidebarOpen(true);
  };

  const confirmMove = async (targetCollection: Collection) => {
    if (!bookToMove) return;
    const today = new Date();
    const formattedDate = `${today.getDate().toString().padStart(2, '0')}.${(today.getMonth() + 1).toString().padStart(2, '0')}.${today.getFullYear()}`;
    const updates = { collection: targetCollection, dateFinished: formattedDate };
    setBooks(prev => prev.map(b => b.id === bookToMove.id ? { ...b, ...updates } : b));
    setBookToMove(null);
    try { await bookService.updateBook(bookToMove.id, updates); } catch (e) {}
  };

  return (
    <div className="min-h-screen bg-[#FDFDFD] text-slate-900 font-sans selection:bg-indigo-100">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-slate-100 px-8 py-4">
        <div className="max-w-screen-2xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 p-2 rounded-lg shadow-sm">
                <Library size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-lg font-black tracking-tight uppercase">Măreția Lecturii</h1>
              <div className="flex items-center gap-1.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isUsingSupabase ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {isUsingSupabase ? "Cloud Synced" : "Local Archive"}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
             <button 
                onClick={findMissingCovers}
                className="hidden sm:flex items-center gap-2 px-4 py-2 border border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-600 rounded-full hover:bg-slate-50 transition-all">
                <RefreshCw size={14} />
                Căutare Coperți
             </button>
             <button 
                onClick={() => { setActiveBook(null); setAiMode('chat'); setSidebarOpen(true); }}
                className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-full hover:bg-slate-800 transition-all text-xs font-black uppercase tracking-widest shadow-xl shadow-slate-200 active:scale-95">
                <Sparkles size={14} />
                AI Assistant
             </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-slate-50 border-b border-slate-100 pt-16 pb-20 px-8">
        <div className="max-w-screen-2xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-6">
                <span className="inline-block py-1 px-3 bg-indigo-50 text-indigo-600 text-[10px] font-bold uppercase tracking-[0.2em] rounded-md">
                    Călătoria de 1.000 de cărți
                </span>
                <h2 className="text-6xl font-black text-slate-900 leading-[1.1]">
                    Reflecții peste <br/>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">cuvinte și timp.</span>
                </h2>
                <div className="flex gap-4 pt-4">
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Total</p>
                        <p className="text-3xl font-black">{stats.total}</p>
                    </div>
                    <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex-1 text-center">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-1 tracking-widest">Rating Mediu</p>
                        <p className="text-3xl font-black text-amber-500">{stats.avgRating}★</p>
                    </div>
                </div>
            </div>
            <div className="hidden lg:flex justify-end">
                <div className="relative w-80 h-96 bg-white rounded-[3rem] shadow-2xl border-4 border-white rotate-3 overflow-hidden group hover:rotate-0 transition-transform duration-700">
                    <img src="https://picsum.photos/400/600?book-art" className="w-full h-full object-cover" alt="Hero" />
                </div>
            </div>
        </div>
      </section>

      {/* Main Controls */}
      <main className="max-w-screen-2xl mx-auto px-8 py-12">
        <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-8">
            <div className="flex bg-slate-100 p-1 rounded-xl">
                {(['All', Collection.Necitite, Collection.Bucuresti, Collection.Slobozia] as const).map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-6 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}
                    >
                        {tab === 'All' ? 'Toate' : tab === Collection.Necitite ? 'Necitite' : tab.replace('Citite ', '')}
                    </button>
                ))}
            </div>

            <div className="flex items-center gap-6 w-full lg:w-auto">
                <div className="relative flex-grow lg:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input 
                        type="text" 
                        placeholder="Caută titlu, autor..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-12 pr-6 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-4 focus:ring-slate-100 outline-none transition-all text-sm font-medium"
                    />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-xl">
                     {[
                        { id: 'grid', icon: LayoutGrid },
                        { id: 'list', icon: List },
                        { id: 'table', icon: TableIcon }
                     ].map(mode => (
                         <button
                            key={mode.id}
                            onClick={() => setViewMode(mode.id as any)}
                            className={`p-2 rounded-lg transition-all ${viewMode === mode.id ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400'}`}
                         >
                            <mode.icon size={18} />
                         </button>
                     ))}
                </div>
            </div>
        </div>

        {/* Improved Sort & Filter Row */}
        <div className="flex flex-wrap items-center gap-y-4 gap-x-8 mb-12 py-6 border-y border-slate-100">
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <ArrowUpDown size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Sortare:</span>
                </div>
                <div className="flex gap-1.5">
                    {[
                        { id: 'dateFinished', label: 'Recent Finalizate', icon: Calendar },
                        { id: 'rating', label: 'Top Rating', icon: Star },
                        { id: 'nr', label: 'Număr Index', icon: Hash }
                    ].map((s) => (
                        <button
                            key={s.id}
                            onClick={() => handleSort(s.id as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all flex items-center gap-2 border ${sortField === s.id ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-400'}`}
                        >
                            <s.icon size={12} fill={sortField === s.id && s.id === 'rating' ? "currentColor" : "none"} />
                            {s.label}
                            {sortField === s.id && <span className="ml-1 opacity-70">{sortDirection === 'asc' ? '↑' : '↓'}</span>}
                        </button>
                    ))}
                </div>
            </div>

            <div className="hidden lg:block h-6 w-px bg-slate-200" />

            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                    <Filter size={14} className="text-slate-400" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Filtrează:</span>
                </div>
                <div className="flex gap-1.5">
                    {['All', 5, 4, 3].map((r) => (
                        <button
                            key={r}
                            onClick={() => setFilterRating(r as any)}
                            className={`px-4 py-2 rounded-xl text-[10px] font-bold transition-all ${filterRating === r ? 'bg-amber-500 text-white shadow-lg shadow-amber-100' : 'bg-slate-50 text-slate-500 hover:bg-slate-200'}`}
                        >
                            {r === 'All' ? 'Toate Stelele' : `${r} ★`}
                        </button>
                    ))}
                </div>
            </div>

            <div className="ml-auto">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em] bg-slate-100 px-4 py-2 rounded-full">
                    {filteredBooks.length} Volume
                </span>
            </div>
        </div>

        {isLoading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
                <Loader2 className="animate-spin text-slate-900" size={32} />
                <p className="text-xs font-black uppercase tracking-widest text-slate-400">Încărcăm biblioteca...</p>
            </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-700">
            {viewMode === 'grid' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-8">
                    {filteredBooks.map(book => (
                        <BookCard 
                            key={book.id} 
                            book={book} 
                            onOpenAiTools={handleOpenAi} 
                            onOpenDetails={() => setSelectedBookForDetails(book)}
                            onMarkRead={book.collection === Collection.Necitite ? () => setBookToMove(book) : undefined}
                            onDelete={book.collection === Collection.Necitite ? () => handleDeleteBook(book.id) : undefined}
                        />
                    ))}
                </div>
            )}
            
            {viewMode === 'list' && (
                <div className="space-y-4">
                    {filteredBooks.map(book => (
                        <BookRow 
                            key={book.id} 
                            book={book} 
                            onOpenAiTools={handleOpenAi}
                            onMarkRead={book.collection === Collection.Necitite ? () => setBookToMove(book) : undefined}
                            onDelete={book.collection === Collection.Necitite ? () => handleDeleteBook(book.id) : undefined}
                        />
                    ))}
                </div>
            )}

            {viewMode === 'table' && (
                <BookTable 
                    books={filteredBooks} 
                    onUpdate={handleUpdateBook} 
                    onOpenAiTools={handleOpenAi} 
                    onSort={handleSort}
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onMarkRead={(book) => book.collection === Collection.Necitite ? setBookToMove(book) : null}
                    onDelete={(book) => book.collection === Collection.Necitite ? handleDeleteBook(book.id) : null}
                />
            )}
          </div>
        )}
      </main>

      {/* Book Details Modal */}
      {selectedBookForDetails && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-6 sm:p-12">
            <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl" onClick={() => setSelectedBookForDetails(null)} />
            <div className="bg-white rounded-[3rem] w-full max-w-5xl h-full max-h-[850px] relative overflow-hidden shadow-2xl flex flex-col md:flex-row transform transition-all animate-in zoom-in duration-500">
                <button onClick={() => setSelectedBookForDetails(null)} className="absolute top-8 right-8 z-10 p-3 bg-slate-100 hover:bg-slate-200 rounded-full transition-colors"><X size={24}/></button>
                <div className="md:w-2/5 h-64 md:h-auto relative bg-slate-100">
                    <img src={selectedBookForDetails.coverUrl} className="w-full h-full object-cover" alt={selectedBookForDetails.title} />
                </div>
                <div className="md:w-3/5 p-12 overflow-y-auto custom-scrollbar flex flex-col">
                    <div className="mb-10">
                        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] mb-2"># {selectedBookForDetails.nr} • {selectedBookForDetails.author}</p>
                        <h2 className="text-4xl font-black text-slate-900 leading-tight mb-6">{selectedBookForDetails.title}</h2>
                        <div className="flex gap-8 items-center py-6 border-y border-slate-100">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rating</span>
                                <div className="flex text-amber-500 gap-0.5">
                                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill={i < selectedBookForDetails.rating ? "currentColor" : "none"} />)}
                                </div>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Finalizat</span>
                                <p className="text-sm font-black">{selectedBookForDetails.dateFinished || 'N/A'}</p>
                            </div>
                        </div>
                    </div>
                    <div className="mt-auto flex gap-4">
                        <button 
                            onClick={() => { setSelectedBookForDetails(null); handleOpenAi(selectedBookForDetails, 'chat'); }}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-2">
                            Analiză AI Profundă
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {bookToMove && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-md" onClick={() => setBookToMove(null)} />
            <div className="bg-white rounded-[2.5rem] p-12 max-w-md w-full relative shadow-2xl text-center">
                <CheckCircle size={48} className="text-emerald-500 mx-auto mb-6" />
                <h3 className="text-2xl font-black">Felicitări!</h3>
                <p className="text-slate-500 mt-2 mb-10 text-sm">Unde arhivăm lectura?</p>
                <div className="space-y-3">
                    <button onClick={() => confirmMove(Collection.Bucuresti)} className="w-full p-5 bg-slate-50 hover:bg-indigo-600 hover:text-white rounded-2xl transition-all font-bold flex items-center justify-between">
                        <span>București</span> <ArrowRight size={16} />
                    </button>
                    <button onClick={() => confirmMove(Collection.Slobozia)} className="w-full p-5 bg-slate-50 hover:bg-violet-600 hover:text-white rounded-2xl transition-all font-bold flex items-center justify-between">
                        <span>Slobozia</span> <ArrowRight size={16} />
                    </button>
                </div>
            </div>
        </div>
      )}

      {sidebarOpen && (
        <>
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40" onClick={() => setSidebarOpen(false)} />
            <AiSidebar 
                book={activeBook} 
                initialMode={aiMode} 
                onClose={() => setSidebarOpen(false)} 
            />
        </>
      )}
    </div>
  );
};

export default App;
