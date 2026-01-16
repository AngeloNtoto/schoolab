import { Wifi, Send, CheckCircle, AlertCircle, Loader2, Monitor, ChevronDown } from 'lucide-react';
import { networkService } from '../../services/networkService';
import { dbService } from '../../services/databaseService';
import React,{useState,useEffect} from 'react';

export default function SendPanel() {
  const [peers, setPeers] = useState<any[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<any | null>(null);
  const [sending, setSending] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState<string>('');

  useEffect(() => {
    loadPeers();
    loadClasses();
    
    // Listen for peer updates
    const removeListener = networkService.onPeersUpdated((_event, updatedPeers) => {
      setPeers(updatedPeers);
    });

    return () => removeListener();
  }, []);

  const loadClasses = async () => {
    const cls = await dbService.query<any>('SELECT * FROM classes ORDER BY name');
    setClasses(cls);
  };

  const loadPeers = async () => {
    const p = await networkService.getPeers();
    setPeers(p || []);
  };

  const handleSend = async () => {
    if (!selectedPeer || !selectedClass) return;
    
    setSending(true);
    setStatus('idle');
    
    try {
      // Fetch class data
      const classId = parseInt(selectedClass);
      const classInfo = classes.find(c => c.id === classId);
      const students = await dbService.query<any>('SELECT * FROM students WHERE class_id = ?', [classId]);
      const grades = await dbService.query<any>(
        'SELECT g.* FROM grades g JOIN students s ON g.student_id = s.id WHERE s.class_id = ?', 
        [classId]
      );
      const subjects = await dbService.query<any>('SELECT * FROM subjects WHERE class_id = ?', [classId]);

      const payload = {
        sender: await networkService.getIdentity(),
        type: 'CLASS_DATA',
        timestamp: Date.now(),
        data: {
          classInfo,
          students,
          grades,
          subjects
        },
        description: `Données de la classe ${classInfo.name}`
      };

      await networkService.sendFile(selectedPeer, payload);
      setStatus('success');
      setTimeout(() => setStatus('idle'), 3000);
    } catch (err) {
      console.error(err);
      setStatus('error');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-10 group">
        <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-3 px-1">1. Sélectionnez les données à envoyer</label>
        <div className="relative group/select">
          <select
            value={selectedClass}
            onChange={(e) => setSelectedClass(e.target.value)}
            className="w-full p-5 bg-slate-50 dark:bg-black/20 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-black text-sm focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none appearance-none transition-all shadow-inner cursor-pointer"
          >
            <option value="" className="dark:bg-slate-900">-- Choisir une classe --</option>
            {classes.map(cls => (
              <option key={cls.id} value={cls.id} className="dark:bg-slate-900">
                {cls.name} • {cls.level} • {cls.option}
              </option>
            ))}
          </select>
          <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 group-focus-within/select:text-blue-500 transition-colors">
            <ChevronDown size={20} />
          </div>
        </div>
      </div>

      <h2 className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.2em] mb-6 flex items-center gap-3 px-1">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
        2. Sélectionnez le destinataire
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
        {peers.length === 0 ? (
          <div className="col-span-full text-center py-20 text-slate-400 bg-slate-50/50 dark:bg-black/20 rounded-[2.5rem] border-2 border-dashed border-slate-200 dark:border-white/5 animate-pulse">
            <Wifi size={64} className="mx-auto mb-4 opacity-20 text-blue-500" />
            <p className="font-black uppercase tracking-widest text-xs mb-2">Recherche de machines...</p>
            <p className="text-[10px] font-bold opacity-60 max-w-xs mx-auto">Assurez-vous que les autres ordinateurs sont connectés au même WiFi et ont l'application ouverte.</p>
          </div>
        ) : (
          peers.map((peer, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPeer(peer)}
              className={`p-6 rounded-[2rem] border-2 text-left transition-all relative overflow-hidden group ${
                selectedPeer === peer
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-600/10 shadow-2xl shadow-blue-500/20 ring-4 ring-blue-500/5'
                  : 'border-white dark:border-white/5 bg-white dark:bg-white/5 hover:border-slate-200 dark:hover:border-blue-500/30 shadow-lg shadow-slate-200/40 dark:shadow-black/40'
              }`}
            >
              <div className="flex items-center gap-5 relative z-10">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-500 ${
                  selectedPeer === peer 
                    ? 'bg-blue-600 text-white rotate-12' 
                    : 'bg-slate-100 dark:bg-black/20 text-slate-400 dark:text-slate-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500'
                }`}>
                  <Monitor size={28} />
                </div>
                <div>
                  <div className="font-black text-slate-800 dark:text-white tracking-tight text-lg">{peer.name}</div>
                  <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 font-mono uppercase tracking-widest mt-1 bg-slate-100 dark:bg-black/20 px-2 py-0.5 rounded-lg inline-block">{peer.ip}</div>
                </div>
              </div>
              {selectedPeer === peer && (
                <div className="absolute -right-4 -bottom-4 bg-blue-500/10 w-24 h-24 rounded-full blur-3xl" />
              )}
            </button>
          ))
        )}
      </div>

      {/* Action Area */}
      <div className="border-t border-slate-100 dark:border-white/5 pt-10">
        <div className="flex items-center justify-between bg-slate-50 dark:bg-black/20 p-6 rounded-[2.5rem] border border-slate-100 dark:border-white/5 shadow-inner">
          <div className="flex flex-col gap-1">
             <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Prêt pour l'envoi</span>
            {selectedPeer ? (
              <span className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-ping" />
                Transfert vers <span className="text-blue-600 dark:text-blue-400 underline decoration-2 underline-offset-4">{selectedPeer.name}</span>
              </span>
            ) : (
              <span className="text-sm font-black text-slate-400 dark:text-slate-600 italic">Veuillez sélectionner un destinataire</span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!selectedPeer || !selectedClass || sending}
            className={`flex items-center gap-4 px-10 py-5 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl active:scale-95 ${
              !selectedPeer || !selectedClass || sending
                ? 'bg-slate-200 dark:bg-white/5 text-slate-400 dark:text-slate-600 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700 shadow-blue-500/20'
            }`}
          >
            {sending ? (
              <>
                <Loader2 size={20} className="animate-spin text-white" />
                Transfert en cours...
              </>
            ) : status === 'success' ? (
              <>
                <div className="bg-white/20 p-1 rounded-lg"><CheckCircle size={20} /></div>
                Données Envoyées !
              </>
            ) : status === 'error' ? (
              <>
                <div className="bg-red-500/20 p-1 rounded-lg"><AlertCircle size={20} /></div>
                Erreur d'envoi
              </>
            ) : (
              <>
                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                Lancer le transfert
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
