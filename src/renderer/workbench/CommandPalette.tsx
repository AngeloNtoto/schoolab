import React, { useState, useEffect, useRef } from 'react';
import { useWorkbench } from './WorkbenchProvider';

export default function CommandPalette() {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const { commands, executeCommand } = useWorkbench();
  const inputRef = useRef<HTMLInputElement>(null);

  // Fonction pour enlever les accents
  const normalize = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Filtrer les commandes selon la recherche (tolérant)
  const queryTerms = normalize(query).split(' ').filter(Boolean);
  const filteredCommands = commands.filter(cmd => {
    if (queryTerms.length === 0) return true;
    const searchString = normalize(cmd.title + ' ' + cmd.category);
    return queryTerms.every(term => searchString.includes(term));
  });

  useEffect(() => {
    // Écouter le raccourci global Ctrl+K (ou Cmd+K sur Mac)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(prev => !prev);
        setQuery('');
        setSelectedIndex(0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev + 1) % filteredCommands.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev - 1 + filteredCommands.length) % filteredCommands.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex].id);
        setIsOpen(false);
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-start justify-center pt-[15vh] animate-in fade-in duration-200" onClick={() => setIsOpen(false)}>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
      <div 
        className="relative w-full max-w-2xl bg-white dark:bg-[#020617] rounded-[2rem] shadow-2xl overflow-hidden border border-slate-200 dark:border-white/10 animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-6 py-2 border-b border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-slate-900/50">
          <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <input
            ref={inputRef}
            type="text"
            className="w-full px-4 py-5 text-lg font-medium text-slate-800 dark:text-slate-100 bg-transparent outline-none placeholder-slate-400 dark:placeholder-slate-500"
            placeholder="Que souhaitez-vous faire ? (Ex: notes, classe, élève...)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-200/50 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500 tracking-widest uppercase">
            ESC
          </div>
        </div>
        
        <div className="max-h-[50vh] overflow-y-auto p-3 custom-scrollbar">
          {filteredCommands.length === 0 ? (
            <div className="py-12 text-center text-slate-500 dark:text-slate-400">
              <p className="text-sm font-medium">Aucune commande ne correspond à "{query}"</p>
            </div>
          ) : (
            filteredCommands.map((cmd, i) => (
              <button
                key={cmd.id}
                className={`w-full text-left px-4 py-3.5 rounded-xl flex items-center justify-between group transition-all duration-200 mb-1 ${
                  i === selectedIndex 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 scale-[0.99]' 
                    : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
                onClick={() => {
                  executeCommand(cmd.id);
                  setIsOpen(false);
                }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <div className="flex items-center gap-4">
                  <div className={`p-2 rounded-lg ${i === selectedIndex ? 'bg-white/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500'}`}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <div className="font-bold text-sm tracking-tight">{cmd.title}</div>
                    <div className={`text-[10px] font-bold uppercase tracking-widest mt-0.5 ${i === selectedIndex ? 'text-blue-200' : 'text-slate-400 dark:text-slate-500'}`}>
                      {cmd.category}
                    </div>
                  </div>
                </div>
                {cmd.shortcut && (
                  <div className={`flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity ${i === selectedIndex ? 'text-white' : 'text-slate-500'}`}>
                    <kbd className={`px-2 py-1 rounded text-[10px] font-black tracking-widest uppercase border ${i === selectedIndex ? 'bg-blue-700 border-blue-500' : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                      {cmd.shortcut}
                    </kbd>
                  </div>
                )}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
