import React, { useState, useEffect } from 'react';
import { Monitor, Send, Download, RefreshCw, Settings, ArrowLeft, Globe } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import SendPanel from './SendPanel';
import TransferInbox from './TransferInbox';
import SyncPanel from './SyncPanel';
import ServerPanel from './ServerPanel';

export default function NetworkDashboard() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'send' | 'receive' | 'sync' | 'server'>('receive');
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
    <div className="min-h-screen bg-slate-50 relative">
      {/* Watermark Background */}
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
      <header className="bg-gradient-to-r from-blue-600 to-blue-700 shadow-lg relative">
        <div className="max-w-[95%] mx-auto px-8 py-6">
          <div className="flex items-center justify-between flex-wrap gap-6">
            <div className="flex items-center gap-4">
              <button 
                onClick={() => navigate(-1)} 
                className="bg-white/10 hover:bg-white/20 text-white p-2 rounded-lg backdrop-blur-sm transition-colors"
                title="Retour"
              >
                <ArrowLeft size={24} />
              </button>
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Monitor className="text-white" size={32} />
              </div>
              <div className="text-white">
                <h1 className="text-2xl font-bold">Gestion Réseau</h1>
                <div className="flex items-center gap-2 text-blue-100 text-sm mt-1">
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
            <div className="flex bg-black/20 p-1.5 rounded-xl backdrop-blur-sm flex-wrap">
              {[
                { id: 'receive', label: 'Boîte', icon: Download },
                { id: 'send', label: 'Envoyer', icon: Send },
                { id: 'sync', label: 'Clonage', icon: RefreshCw },
                { id: 'server', label: 'Serveur Web', icon: Globe },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-lg transition-all font-bold text-sm ${
                    activeTab === tab.id 
                      ? 'bg-white text-blue-600 shadow-md' 
                      : 'text-blue-100 hover:text-white hover:bg-white/10'
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
        <div className="bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden min-h-[600px] animate-in fade-in slide-in-from-bottom-4 duration-500">
          {activeTab === 'send' ? <SendPanel /> : 
           activeTab === 'receive' ? <TransferInbox /> : 
           activeTab === 'sync' ? <SyncPanel /> : 
           <ServerPanel />}
        </div>
      </main>
    </div>
  );
}
