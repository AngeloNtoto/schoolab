import React, { useState, useEffect } from 'react';
import { Monitor, Send, Download, RefreshCw, Settings, ArrowLeft, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
    const name = await window.api.network.getIdentity();
    setIdentity(name);
    setNewName(name);
  };

  const handleSaveIdentity = async () => {
    if (newName && newName !== identity) {
      await window.api.network.setIdentity(newName);
      setIdentity(newName);
    }
    setIsEditing(false);
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 relative transition-colors duration-500">
      <div 
        className="fixed inset-0 opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url(/assets/watermark.png)',
          backgroundSize: '400px',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      />

      {/* Header */}
      <header className="bg-blue-600 dark:bg-slate-900/50 border-b border-transparent dark:border-white/5 relative shadow-lg transition-colors duration-500 backdrop-blur-xl">
        <div className="max-w-[95%] mx-auto px-8 py-10">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-6">
              <button 
                onClick={() => navigate(-1)} 
                className="bg-white/10 hover:bg-white/20 text-white p-3 rounded-2xl backdrop-blur-md transition-all shadow-xl"
                title="Retour"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="bg-white/20 dark:bg-blue-600/30 p-4 rounded-[2rem] backdrop-blur-md shadow-2xl rotate-3">
                <Monitor className="text-white dark:text-blue-400" size={36} />
              </div>
              <div>
                <h1 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">Gestion Réseau</h1>
                <div className="flex items-center gap-3 text-blue-100 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest mt-1.5">
                  <Globe size={12} className="text-blue-200 dark:text-blue-400" />
                  <span>Nom de cet appareil:</span>
                  {isEditing ? (
                    <div className="flex items-center gap-2 bg-white/10 rounded px-2 py-0.5">
                      <input
                        type="text"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="bg-transparent border-none focus:ring-0 text-white p-0 h-auto w-32 outline-none"
                        autoFocus
                      />
                      <button onClick={handleSaveIdentity} className="text-green-300 hover:text-green-100 font-bold text-xs uppercase">Valider</button>
                      <button onClick={() => setIsEditing(false)} className="text-red-300 hover:text-red-100 font-bold text-xs uppercase">Annuler</button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 group cursor-pointer" onClick={() => setIsEditing(true)}>
                      <span className="font-mono font-medium underline decoration-blue-400/50 underline-offset-4">
                        {identity}
                      </span>
                      <Settings size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Tab Switcher */}
            <div className="flex bg-white/10 dark:bg-black/40 p-1.5 rounded-2xl backdrop-blur-md border border-white/10 dark:border-white/5 shadow-2xl overflow-x-auto no-scrollbar">
              {[
                { id: 'receive', label: 'Recevoir', icon: Download },
                { id: 'send', label: 'Envoyer', icon: Send },
                { id: 'sync', label: 'Synchronisation', icon: RefreshCw },
                { id: 'server', label: 'Serveur Web', icon: Globe },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-3 px-6 py-3 rounded-xl transition-all font-black text-[10px] uppercase tracking-widest whitespace-nowrap ${
                    activeTab === tab.id 
                      ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-2xl shadow-blue-500/20 ring-1 ring-white/20' 
                      : 'text-white/60 hover:text-white hover:bg-white/10'
                  }`}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[95%] mx-auto px-8 py-8 relative">
        <div className="bg-white dark:bg-slate-900/50 backdrop-blur-xl rounded-[2.5rem] shadow-2xl border border-slate-200 dark:border-white/5 overflow-hidden min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-700">
           {activeTab === 'send' && <SendPanel />}
           {activeTab === 'receive' && <TransferInbox />}
           {activeTab === 'sync' && <SyncPanel />}
           {activeTab === 'server' && <ServerPanel />}
        </div>
      </main>
    </div>
  );
}
