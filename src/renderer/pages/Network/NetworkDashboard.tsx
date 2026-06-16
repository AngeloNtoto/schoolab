import React, { useState, useEffect } from 'react';
import { Monitor, Send, Download, RefreshCw, Settings, ArrowLeft, Globe } from '../../components/iconsSvg';
import { useNavigate } from 'react-router-dom';
import { networkService } from '../../services/networkService';
import SendPanel from './SendPanel';
import TransferInbox from './TransferInbox';
import SyncPanel from './SyncPanel';
import ServerPanel from './ServerPanel';

export default function NetworkDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'sync' | 'server'>('server');
  const [identity, setIdentity] = useState<string>('Loading...');
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState('');

  useEffect(() => {
    loadIdentity();
  }, []);

  const loadIdentity = async () => {
    const name = await networkService.getIdentity();
    setIdentity(name);
    setNewName(name);
  };

  const handleSaveIdentity = async () => {
    if (newName && newName !== identity) {
      await networkService.setIdentity(newName);
      setIdentity(newName);
    }
    setIsEditing(false);
  };

  return (
    <div className="h-full bg-slate-50 dark:bg-slate-950 overflow-hidden flex flex-col font-sans transition-colors duration-300">
      <div className="h-6 flex-shrink-0"></div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar latérale */}
        <div className="w-[280px] flex-shrink-0 px-6 pb-6 flex flex-col h-full overflow-y-auto bg-slate-50 dark:bg-slate-950">
          <div className="flex items-center gap-3 mb-6">
             <button 
                onClick={() => navigate(-1)} 
                className="bg-slate-200/50 hover:bg-slate-300/50 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 p-2 rounded-xl transition-all"
                title="Retour"
              >
                <ArrowLeft size={18} />
              </button>
            <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Réseau</h1>
          </div>
          
          <div className="mb-6 px-3 py-3 bg-white/50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl">
             <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">Cet appareil</p>
             {isEditing ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="bg-white dark:bg-black/50 border border-slate-300 dark:border-white/10 rounded px-2 py-1 text-sm text-slate-900 dark:text-white outline-none w-full"
                    autoFocus
                  />
                  <button onClick={handleSaveIdentity} className="text-green-600 dark:text-green-400 font-bold text-xs">OK</button>
                  <button onClick={() => setIsEditing(false)} className="text-red-600 dark:text-red-400 font-bold text-xs">X</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                  <Monitor size={14} className="text-blue-500" />
                  <span className="font-mono font-medium text-slate-800 dark:text-slate-200 truncate">
                    {identity}
                  </span>
                  <Settings size={12} className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 ml-auto" />
                </div>
              )}
          </div>

          <nav className="flex-1 space-y-1">
            {[
              { id: 'receive', label: 'Recevoir', icon: Download },
              { id: 'send', label: 'Envoyer', icon: Send },
              { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
              { id: 'server', label: 'Serveur Web', icon: Globe },
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 hover:scale-[1.01] ${
                    isActive
                      ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border-l-[3px] border-blue-500 pl-3'
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-900/50 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <tab.icon size={16} className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'opacity-70 group-hover:opacity-100'}`} />
                  <span className={`text-[13px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Contenu principal */}
        <div className="flex-1 h-full overflow-y-auto bg-white dark:bg-[#0c101d] rounded-tl-[2rem] border-t border-l border-slate-200/60 dark:border-white/5 shadow-2xl transition-colors duration-300">
          <div className="max-w-4xl py-10 px-8 md:px-12 pb-24">
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
               {activeTab === 'send' && <SendPanel />}
               {activeTab === 'receive' && <TransferInbox />}
               {activeTab === 'sync' && <SyncPanel />}
               {activeTab === 'server' && <ServerPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
