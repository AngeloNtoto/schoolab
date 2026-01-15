import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, Copy, Check, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ServerPanel() {
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadServerInfo();
    const interval = setInterval(() => {
      loadServerInfo();
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const loadServerInfo = async () => {
    const info = await window.api.network.getServerInfo();
    setServerInfo(info);
  };

  const serverUrl = serverInfo ? `http://${serverInfo.ip}:${serverInfo.port}` : 'Chargement...';

  const handleCopy = () => {
    navigator.clipboard.writeText(serverUrl);
    setCopied(true);
    toast.success('URL copiée dans le presse-papier !');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6">
      <div className="mb-10">
        <h2 className="text-3xl font-black text-slate-800 dark:text-white flex items-center gap-4 tracking-tight">
          <div className="bg-blue-600 dark:bg-blue-600/20 p-3 rounded-2xl shadow-xl shadow-blue-500/20">
            <Monitor size={32} className="text-white dark:text-blue-400" />
          </div>
          Serveur Web Schoolab
        </h2>
        <p className="text-slate-500 dark:text-slate-400 mt-3 font-medium text-lg max-w-2xl">Transformez ce PC en serveur pour permettre aux autres de saisir les points depuis n'importe quel appareil.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* URL Card */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 rounded-[2.5rem] p-8 text-white shadow-2xl relative overflow-hidden group border border-white/10">
          <Globe className="absolute -right-8 -bottom-8 w-48 h-48 opacity-10 group-hover:scale-110 group-hover:rotate-12 transition-all duration-1000" />
          <div className="relative z-10">
            <span className="text-blue-100/80 text-[10px] font-black uppercase tracking-[0.2em]">Adresse du Marking Board</span>
            <div className="mt-4 flex items-center justify-between gap-6 bg-black/30 p-6 rounded-[2rem] backdrop-blur-xl border border-white/10 shadow-inner">
              <code className="text-2xl font-mono font-black break-all tracking-tight selection:bg-blue-500 selection:text-white">{serverUrl}</code>
              <button 
                onClick={handleCopy}
                className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl transition-all shrink-0 active:scale-90 border border-white/5"
              >
                {copied ? <Check size={24} className="text-green-400" /> : <Copy size={24} />}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="flex flex-col justify-center gap-6">
          <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-xl group">
             <div className="bg-amber-100 dark:bg-amber-500/20 p-3 rounded-2xl text-amber-600 dark:text-amber-400 shrink-0 group-hover:rotate-12 transition-transform">
                <Info size={24} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px] mb-1">Comment se connecter ?</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Ouvrez le navigateur sur n'importe quel téléphone, tablette ou PC connecté au même WiFi et tapez l'adresse ci-contre.</p>
             </div>
          </div>
          <div className="flex items-start gap-4 p-5 bg-slate-50 dark:bg-white/5 rounded-[2rem] border border-slate-100 dark:border-white/5 transition-all hover:bg-white dark:hover:bg-white/10 hover:shadow-xl group">
             <div className="bg-green-100 dark:bg-green-500/20 p-3 rounded-2xl text-green-600 dark:text-green-400 shrink-0 group-hover:rotate-12 transition-transform">
                <Smartphone size={24} />
             </div>
             <div>
                <h4 className="font-black text-slate-800 dark:text-white uppercase tracking-widest text-[10px] mb-1">Optimisé pour Mobile</h4>
                <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">L'interface s'adapte parfaitement aux petits écrans pour une saisie rapide des points en classe.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-[2rem] p-8 shadow-inner">
        <h3 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3">
          <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
          État du service en temps réel
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
           <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Serveur API</span>
              {serverInfo?.ip === "127.0.0.1" ? (
                <div className="flex items-center gap-3 bg-red-500/10 dark:bg-red-500/5 px-4 py-3 rounded-xl border border-red-500/20">
                  <span className="w-2 h-2 bg-red-600 rounded-full" />
                  <span className="text-sm font-black text-red-600 uppercase tracking-widest">INACTIF</span>
                </div>
              ) : (
                <div className="flex items-center gap-3 bg-green-500/10 dark:bg-green-500/5 px-4 py-3 rounded-xl border border-green-500/20">
                  <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                  <span className="text-sm font-black text-green-600 uppercase tracking-widest">ACTIF</span>
                </div>
              )}
           </div>
           
           <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Interface Web</span>
              <div className="flex items-center gap-3 bg-green-500/10 dark:bg-green-500/5 px-4 py-3 rounded-xl border border-green-500/20">
                <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                <span className="text-sm font-black text-green-600 uppercase tracking-widest">PRÊT</span>
              </div>
           </div>

           <div className="flex flex-col gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-widest">Port Utilisé</span>
              <div className="flex items-center gap-3 bg-slate-200/50 dark:bg-black/20 px-4 py-3 rounded-xl border border-slate-300 dark:border-white/5">
                <span className="text-lg font-mono font-black text-slate-800 dark:text-white">{serverInfo?.port}</span>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
}
