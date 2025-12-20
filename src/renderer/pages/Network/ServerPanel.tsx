import React, { useState, useEffect } from 'react';
import { Monitor, Smartphone, Globe, Copy, Check, Info } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export default function ServerPanel() {
  const [serverInfo, setServerInfo] = useState<{ ip: string; port: number } | null>(null);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadServerInfo();
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
      <div className="mb-8">
        <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
          <Monitor size={24} className="text-blue-600" />
          Serveur Web Ecole
        </h2>
        <p className="text-slate-500 mt-1">Transformez ce PC en serveur pour permettre aux autres de saisir les points.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {/* URL Card */}
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden group">
          <Globe className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10 group-hover:scale-110 transition-transform duration-500" />
          <div className="relative z-10">
            <span className="text-blue-100 text-xs font-bold uppercase tracking-wider">Adresse du Marking Board</span>
            <div className="mt-3 flex items-center justify-between gap-4 bg-black/20 p-4 rounded-xl backdrop-blur-sm border border-white/10">
              <code className="text-lg font-mono font-bold break-all">{serverUrl}</code>
              <button 
                onClick={handleCopy}
                className="p-2 hover:bg-white/10 rounded-lg transition-colors shrink-0"
              >
                {copied ? <Check size={20} className="text-green-400" /> : <Copy size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Info Card */}
        <div className="flex flex-col justify-center gap-4">
          <div className="flex items-start gap-3">
             <div className="bg-amber-100 p-2 rounded-lg text-amber-600 shrink-0">
                <Info size={20} />
             </div>
             <div>
                <h4 className="font-bold text-slate-800">Comment se connecter ?</h4>
                <p className="text-sm text-slate-500">Ouvrez le navigateur (Chrome, Safari, etc.) sur n'importe quel téléphone, tablette ou PC connecté au même WiFi et tapez l'adresse ci-contre.</p>
             </div>
          </div>
          <div className="flex items-start gap-3">
             <div className="bg-green-100 p-2 rounded-lg text-green-600 shrink-0">
                <Smartphone size={20} />
             </div>
             <div>
                <h4 className="font-bold text-slate-800">Optimisé pour Mobile</h4>
                <p className="text-sm text-slate-500">L'interface s'adapte parfaitement aux petits écrans pour une saisie rapide des points en classe.</p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6">
        <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
          <Check size={18} className="text-green-600" />
          État du service
        </h3>
        <div className="space-y-4">
           <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-600">Serveur API</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                 <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                 ACTIF
              </span>
           </div>
           <div className="flex items-center justify-between py-2 border-b border-slate-200">
              <span className="text-sm text-slate-600">Interface Web</span>
              <span className="flex items-center gap-1.5 text-xs font-bold text-green-600">
                 <span className="w-2 h-2 bg-green-600 rounded-full animate-pulse" />
                 PRÊT
              </span>
           </div>
           <div className="flex items-center justify-between py-2">
              <span className="text-sm text-slate-600">Port utilisé</span>
              <span className="text-sm font-mono font-bold text-slate-800">{serverInfo?.port}</span>
           </div>
        </div>
      </div>
    </div>
  );
}
