import React, { useState, useEffect } from 'react';
import { Wifi, Send, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

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
    const removeListener = window.api.network.onPeersUpdated((_event, updatedPeers) => {
      setPeers(updatedPeers);
    });

    return () => removeListener();
  }, []);

  const loadClasses = async () => {
    const cls = await window.api.db.query('SELECT * FROM classes ORDER BY name');
    setClasses(cls);
  };

  const loadPeers = async () => {
    const p = await window.api.network.getPeers();
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
      const students = await window.api.db.query('SELECT * FROM students WHERE class_id = ?', [classId]);
      const grades = await window.api.db.query(
        'SELECT g.* FROM grades g JOIN students s ON g.student_id = s.id WHERE s.class_id = ?', 
        [classId]
      );
      const subjects = await window.api.db.query('SELECT * FROM subjects WHERE class_id = ?', [classId]);

      const payload = {
        sender: await window.api.network.getIdentity(),
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

      await window.api.network.sendFile(selectedPeer, payload);
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
      <div className="mb-6">
        <label className="block text-sm font-medium text-slate-700 mb-2">1. Sélectionnez les données à envoyer</label>
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="w-full p-3 border border-slate-300 rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        >
          <option value="">-- Choisir une classe --</option>
          {classes.map(cls => (
            <option key={cls.id} value={cls.id}>
              {cls.name} {cls.level} {cls.option}
            </option>
          ))}
        </select>
      </div>

      <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
        <Send size={20} className="text-blue-600" />
        2. Sélectionnez le destinataire
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {peers.length === 0 ? (
          <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            <Wifi size={48} className="mx-auto mb-2 opacity-50" />
            <p>Aucune autre machine détectée sur le réseau.</p>
            <p className="text-sm">Assurez-vous que les autres ordinateurs sont connectés au même WiFi.</p>
          </div>
        ) : (
          peers.map((peer, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedPeer(peer)}
              className={`p-4 rounded-xl border text-left transition-all ${
                selectedPeer === peer
                  ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                  : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                  <Wifi size={20} className={selectedPeer === peer ? 'text-blue-600' : 'text-slate-400'} />
                </div>
                <div>
                  <div className="font-bold text-slate-800">{peer.name}</div>
                  <div className="text-xs text-slate-500 font-mono">{peer.ip}</div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Action Area */}
      <div className="border-t pt-6">
        <div className="flex items-center justify-between">
          <div className="text-sm text-slate-500">
            {selectedPeer ? (
              <span>Destinataire : <strong className="text-slate-900">{selectedPeer.name}</strong></span>
            ) : (
              <span>Sélectionnez un destinataire ci-dessus</span>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!selectedPeer || !selectedClass || sending}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-medium text-white transition-all ${
              !selectedPeer || !selectedClass || sending
                ? 'bg-slate-300 cursor-not-allowed'
                : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'
            }`}
          >
            {sending ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Envoi en cours...
              </>
            ) : status === 'success' ? (
              <>
                <CheckCircle size={18} />
                Envoyé !
              </>
            ) : status === 'error' ? (
              <>
                <AlertCircle size={18} />
                Erreur
              </>
            ) : (
              <>
                <Send size={18} />
                Envoyer les données
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
