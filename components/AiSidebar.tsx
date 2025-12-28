
import React, { useState, useEffect } from 'react';
import { Book, AspectRatio } from '../types';
import * as GeminiService from '../services/geminiService';
import { X, Send, Sparkles, Image as ImageIcon, Video, Search, BrainCircuit, Loader2, Info, Link as LinkIcon, AlertCircle } from 'lucide-react';

interface AiSidebarProps {
  book: Book | null;
  initialMode: 'chat' | 'edit' | 'video' | 'analyze' | 'summary' | 'findCover';
  onClose: () => void;
}

const AiSidebar: React.FC<AiSidebarProps> = ({ book, initialMode, onClose }) => {
  const [mode, setMode] = useState<'chat' | 'edit' | 'video' | 'analyze' | 'findCover'>('chat');
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [groundingUrls, setGroundingUrls] = useState<{url: string, title: string}[]>([]);
  
  const [useThinking, setUseThinking] = useState(false);
  const [useSearch, setUseSearch] = useState(false);

  const executeGeneration = async (currentPrompt: string, currentMode: string) => {
    if (!currentPrompt && currentMode !== 'analyze' && currentMode !== 'findCover') return;
    setLoading(true);
    setResult(null);
    setGroundingUrls([]);

    try {
        if (currentMode === 'chat') {
            let finalPrompt = book 
                ? `Discutăm despre "${book.title}" (${book.author}). ${book.summary ? `Rezumat existent: ${book.summary}` : ''}. ${currentPrompt}`
                : currentPrompt;

            const res = await GeminiService.generateResponse(finalPrompt, useThinking, useSearch);
            setResult(res.text || "");
            setGroundingUrls(res.groundingUrls || []);
        } else if (currentMode === 'edit') {
            const newImage = await GeminiService.generateImage(`Remix visuals for ${book?.title || 'a book'}: ${currentPrompt}`, AspectRatio.Square, false);
            setResult(newImage);
        } else if (currentMode === 'video') {
             const videoUrl = await GeminiService.generateVideo(`Motion concept for ${book?.title || 'Book'}: ${currentPrompt}`, '16:9');
             setResult(videoUrl);
        } else if (currentMode === 'analyze') {
             const analysis = await GeminiService.generateResponse(`Deep analytical critique of the narrative and visual themes for: ${book?.title}. ${currentPrompt}`, true, false);
             setResult(analysis.text || "");
        } else if (currentMode === 'findCover') {
             const target = book ? `"${book.title}" by ${book.author}` : "all missing book covers from a library";
             const res = await GeminiService.generateResponse(`
                Găsește cele mai bune URL-uri directe către coperta cărții: ${target}.
                CAUTĂ PE: Google Images, Amazon, Goodreads, OpenLibrary.
                REGULĂ: Returnează o listă de URL-uri care se termină în .jpg sau .png dacă este posibil.
                EXPLICAȚIE: Utilizatorul vrea să înlocuiască placeholder-ele cu imagini reale.
             `, false, true);
             setResult(res.text || "");
             setGroundingUrls(res.groundingUrls || []);
        }
    } catch (error) {
        setResult("Communication error. Please retry.");
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    if (initialMode === 'summary') {
        setMode('chat');
        const p = "Extrage esența cărții: 3 idei filozofice și 3 lecții practice. Format: Bullet points.";
        setPrompt(p);
        if (book) executeGeneration(p, 'chat');
    } else if (initialMode === 'findCover') {
        setMode('findCover');
        executeGeneration("", 'findCover');
    } else {
        setMode(initialMode as any);
        setPrompt('');
    }
  }, [initialMode, book]);

  const tabs = [
    { id: 'chat', icon: Sparkles, label: 'Assistant' },
    { id: 'findCover', icon: Search, label: 'Find Covers' },
    { id: 'edit', icon: ImageIcon, label: 'Visuals' },
    { id: 'video', icon: Video, label: 'Motion' },
  ];

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[500px] bg-white shadow-[-20px_0_60px_rgba(0,0,0,0.1)] z-50 flex flex-col transform transition-all duration-500 ease-out border-l border-slate-100">
      {/* Header */}
      <div className="p-8 border-b border-slate-50 flex justify-between items-start">
        <div>
            <h2 className="text-2xl font-black text-slate-900 flex items-center gap-3">
                <Sparkles className="text-indigo-600" size={24}/>
                Gemini Intelligence
            </h2>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                {book ? `Reflecting on: ${book.title}` : 'General Inquiry Mode'}
            </p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-400" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex p-1.5 bg-slate-50 mx-8 mt-6 rounded-2xl border border-slate-100 overflow-x-auto no-scrollbar">
        {tabs.map(t => (
            <button
                key={t.id}
                onClick={() => { setMode(t.id as any); setResult(null); }}
                className={`flex-none flex items-center justify-center gap-2 py-3 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all ${mode === t.id ? 'bg-white text-slate-900 shadow-sm border border-slate-200' : 'text-slate-400 hover:text-slate-600'}`}
            >
                <t.icon size={14} />
                {t.label}
            </button>
        ))}
      </div>

      {/* Result Display */}
      <div className="flex-grow overflow-y-auto p-8 custom-scrollbar">
        {mode === 'findCover' && !loading && !result && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex gap-3 text-amber-800">
                <AlertCircle size={20} className="flex-shrink-0" />
                <p className="text-xs font-medium leading-relaxed">
                    Sistemul va căuta link-uri directe către imagini. Uneori acestea pot fi temporare, așa că recomandăm folosirea link-urilor din Amazon sau Goodreads.
                </p>
            </div>
        )}

        {result && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {mode === 'edit' && <img src={result} className="w-full rounded-3xl shadow-2xl border-4 border-white" />}
                {mode === 'video' && <video src={result} controls className="w-full rounded-3xl shadow-2xl" autoPlay loop />}
                {(mode === 'chat' || mode === 'analyze' || mode === 'findCover') && (
                    <div className="bg-slate-50 rounded-[2rem] p-8 border border-slate-100 prose prose-slate max-w-none">
                        <div className="text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{result}</div>
                        {groundingUrls.length > 0 && (
                            <div className="mt-8 pt-6 border-t border-slate-200">
                                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><Search size={12}/> Surse Verificate</h4>
                                <div className="flex flex-wrap gap-2">
                                    {groundingUrls.map((g, i) => (
                                        <a key={i} href={g.url} target="_blank" className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-indigo-600 hover:bg-indigo-50 transition-all flex items-center gap-1.5 shadow-sm">
                                            <LinkIcon size={10} />
                                            {g.title}
                                        </a>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        )}

        {loading && (
            <div className="flex flex-col items-center justify-center py-24 space-y-4">
                <Loader2 className="animate-spin text-indigo-600" size={40} />
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Interogare Motoare de Căutare...</span>
            </div>
        )}

        {!result && !loading && (
            <div className="text-center py-24 space-y-4">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <Info size={24} className="text-slate-300" />
                </div>
                <p className="text-sm font-medium text-slate-400">
                    {mode === 'findCover' ? 'Apasă butonul de mai jos pentru a iniția căutarea extensivă.' : 'Introdu o cerință pentru a iniția analiza.'}
                </p>
                {mode === 'findCover' && (
                    <button 
                        onClick={() => executeGeneration("", 'findCover')}
                        className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">
                        Începe Căutarea
                    </button>
                )}
            </div>
        )}
      </div>

      {/* Input Section */}
      <div className="p-8 bg-slate-50 border-t border-slate-100">
        <div className="flex gap-3 mb-4">
            {mode === 'chat' && (
                <>
                    <button 
                        onClick={() => setUseThinking(!useThinking)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${useThinking ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-white text-slate-500 border-slate-200'}`}>
                        <BrainCircuit size={14} /> Mod Gândire
                    </button>
                    <button 
                         onClick={() => setUseSearch(!useSearch)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all flex items-center gap-2 ${useSearch ? 'bg-emerald-600 text-white border-emerald-600 shadow-lg shadow-emerald-100' : 'bg-white text-slate-500 border-slate-200'}`}>
                        <Search size={14} /> Search
                    </button>
                </>
            )}
        </div>

        <div className="relative">
            <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === 'findCover' ? "Specificații adiționale pentru căutare?" : "Ce dorești să afli?"}
                className="w-full bg-white border border-slate-200 rounded-[1.5rem] px-6 py-4 pr-16 text-sm font-medium focus:ring-4 focus:ring-indigo-50 shadow-sm outline-none resize-none h-32 transition-all"
                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); executeGeneration(prompt, mode); } }}
            />
            <button 
                onClick={() => executeGeneration(prompt, mode)}
                disabled={loading || (!prompt && mode !== 'analyze' && mode !== 'findCover')}
                className="absolute bottom-4 right-4 p-3 bg-slate-900 text-white rounded-2xl hover:bg-indigo-600 disabled:opacity-30 transition-all shadow-xl">
                <Send size={20} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default AiSidebar;
