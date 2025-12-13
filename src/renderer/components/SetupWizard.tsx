import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'
import { LEVELS, OPTIONS, SUBJECT_TEMPLATES } from '../../constants/school';
import { ChevronRight, School, Calendar, Users, Check, GraduationCap, Wifi, Download, Plus, Loader2 } from 'lucide-react';
import { getClassDisplayName } from '../lib/classUtils';
import { useToast } from '../context/ToastContext';

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0); // Start at step 0 (choice)
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'new' | 'sync' | null>(null);
  
  // Network sync
  const [peers, setPeers] = useState<any[]>([]);
  const [selectedPeer, setSelectedPeer] = useState<any | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  const toast = useToast();

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');

  // Step 2: Academic Year
  const [yearName, setYearName] = useState('2025-2026');
  const [startDate, setStartDate] = useState('2025-09-02');
  const [endDate, setEndDate] = useState('2026-07-02');

  // Step 3: Classes
  const [classes, setClasses] = useState<{ level: string; option: string; section: string }[]>([]);
  const [newClass, setNewClass] = useState({ level: '7ème' as string, option: 'EB' as string, section: 'A' });

  // Update option when level changes
  React.useEffect(() => {
    if (newClass.level === '7ème' || newClass.level === '8ème') {
      setNewClass(prev => ({ ...prev, option: 'EB' }));
      // Force section to A (not allowed to be "Sans section")
      if (newClass.section === '-') {
        setNewClass(prev => ({ ...prev, section: 'A' }));
      }
    } else {
      // For 1-4ème, default to first non-EB option
      const firstNonEB = OPTIONS.find(o => o.value !== 'EB');
      if (firstNonEB && newClass.option === 'EB') {
        setNewClass(prev => ({ ...prev, option: firstNonEB.value }));
      }
    }
  }, [newClass.level]);

  // Peer discovery for sync mode
  useEffect(() => {
    if (mode === 'sync') {
      loadPeers();
      const removeListener = window.api.network.onPeersUpdated((_event, updatedPeers) => {
        setPeers(updatedPeers.filter((p: any) => p.name !== 'Ecole-' + Math.floor(Math.random() * 1000)));
      });
      return () => removeListener();
    }
  }, [mode]);

  const loadPeers = async () => {
    try {
      const p = await window.api.network.getPeers();
      setPeers(p || []);
    } catch (e) {
      console.error('Failed to load peers:', e);
    }
  };

  const handleSyncFromPeer = async () => {
    if (!selectedPeer) return;
    
    setSyncing(true);
    setSyncStatus('Demande de synchronisation en cours...');
    
    try {
      // Request full database export from peer
      const response = await window.api.network.sendFile(selectedPeer, {
        sender: await window.api.network.getIdentity(),
        type: 'SYNC_REQUEST',
        timestamp: Date.now(),
        data: {},
        description: 'Demande de synchronisation initiale'
      });
      
      setSyncStatus('En attente de la réponse...');
      setSyncStatus('En attente de la réponse...');
      // The actual sync will happen when the host sends back data
      // For now, redirect to dashboard and let the inbox handle it
      toast.info('Demande envoyée ! Attendez que la machine hôte approuve le transfert, puis vérifiez votre boîte de réception.', 10000);
      navigate('/network');
    } catch (err: any) {
      console.error('Sync failed:', err);
      setSyncStatus('Erreur: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const handleNext = async () => {
    if (step === 0) {
      if (mode === 'new') setStep(1);
      // Sync mode stays on step 0
    } else if (step === 1) {
      if (!schoolName || !schoolCity) return;
      if (!schoolName.toLocaleLowerCase().match("mosala")){
        toast.warning("Le nom de l'école doit contenir le mot 'mosala'", 10000);
        return;
      }
      setStep(2);
    } else if (step === 2) {
      if (!yearName || !startDate || !endDate) return;
      setStep(3);
    } else if (step === 3) {
      await finishSetup();
    }
  };

  const addClass = () => {
    setClasses([...classes, { ...newClass }]);
    // Reset section to next letter if possible, or keep same
    const nextSection = String.fromCharCode(newClass.section.charCodeAt(0) + 1);
    setNewClass({ ...newClass, section: nextSection });
  };

  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      // 1. Save Settings
      await window.api.db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['school_name', schoolName]);
      await window.api.db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['school_city', schoolCity]);
      await window.api.db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['school_pobox', schoolPoBox]);

      // 2. Create Academic Year
      const yearResult = await window.api.db.execute(
        'INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
        [yearName, startDate, endDate]
      );
      const yearId = yearResult.lastInsertRowid;

      // 3. Create Classes and Subjects
      for (const cls of classes) {
        const classResult = await window.api.db.execute(
          'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?)',
          [
            getClassDisplayName(cls.level, cls.option, cls.section),
            cls.level,
            cls.option,
            cls.section,
            yearId
          ]
        );
        const classId = classResult.lastInsertRowid;

        // Generate Subjects
        const subjects = SUBJECT_TEMPLATES[cls.option] || SUBJECT_TEMPLATES['EB']; // Fallback
        if (subjects) {
          for (const sub of subjects) {
            await window.api.db.execute(
              'INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [sub.name, sub.code, sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, classId]
            );
          }
        }
      }

      navigate('/dashboard');
      try { window.dispatchEvent(new CustomEvent('db:changed', { detail: {} })); } catch (e) { console.error('dispatch db:changed failed', e); }
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error('Erreur lors de la configuration. Vérifiez la console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        backgroundImage: 'url(/assets/loading-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <GraduationCap size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Bienvenue sur EcoleGest</h1>
              <p className="text-blue-100 mt-1">Assistant de configuration initiale - Configuration de votre établissement</p>
            </div>
          </div>
        </div>

        {/* Steps Indicator - only show after step 0 */}
        {step > 0 && (
          <div className="flex border-b border-slate-200">
            {[
              { n: 1, label: 'École', icon: School },
              { n: 2, label: 'Année', icon: Calendar },
              { n: 3, label: 'Classes', icon: Users },
            ].map((s) => (
              <div
                key={s.n}
                className={`flex-1 p-4 flex items-center justify-center gap-2 ${
                  step >= s.n ? 'text-blue-600 font-medium' : 'text-slate-400'
                } ${step === s.n ? 'bg-blue-50' : ''}`}
              >
                <s.icon size={20} />
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="p-8">
          {/* Step 0: Mode Selection */}
          {step === 0 && !mode && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800 text-center">Comment souhaitez-vous configurer EcoleGest ?</h2>
              
              <div className="grid grid-cols-2 gap-6">
                {/* New School */}
                <button
                  onClick={() => { setMode('new'); setStep(1); }}
                  className="p-8 border-2 border-slate-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-center group"
                >
                  <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-200">
                    <Plus size={32} className="text-blue-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Nouvelle configuration</h3>
                  <p className="text-sm text-slate-500">Créer une nouvelle école avec vos propres classes et élèves</p>
                </button>

                {/* Sync from Network */}
                <button
                  onClick={() => setMode('sync')}
                  className="p-8 border-2 border-slate-200 rounded-xl hover:border-green-500 hover:bg-green-50 transition-all text-center group"
                >
                  <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-200">
                    <Download size={32} className="text-green-600" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800 mb-2">Synchroniser depuis le réseau</h3>
                  <p className="text-sm text-slate-500">Charger les données depuis une autre machine sur le réseau</p>
                </button>
              </div>
            </div>
          )}

          {/* Step 0: Sync Mode - Peer Selection */}
          {step === 0 && mode === 'sync' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-800">Machines disponibles sur le réseau</h2>
                <button onClick={loadPeers} className="text-blue-600 hover:text-blue-700 text-sm flex items-center gap-1">
                  <Wifi size={16} /> Actualiser
                </button>
              </div>
              
              {peers.length === 0 ? (
                <div className="text-center py-12 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Wifi size={48} className="mx-auto mb-2 opacity-50" />
                  <p>Aucune autre machine détectée.</p>
                  <p className="text-sm">Assurez-vous que l'autre ordinateur est sur le même réseau WiFi.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {peers.map((peer, idx) => (
                    <button
                      key={idx}
                      onClick={() => setSelectedPeer(peer)}
                      className={`p-4 rounded-xl border text-left transition-all ${
                        selectedPeer === peer
                          ? 'border-green-500 bg-green-50 ring-2 ring-green-200'
                          : 'border-slate-200 hover:border-green-300 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center border border-slate-100 shadow-sm">
                          <Wifi size={20} className={selectedPeer === peer ? 'text-green-600' : 'text-slate-400'} />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800">{peer.name}</div>
                          <div className="text-xs text-slate-500 font-mono">{peer.ip}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {syncStatus && (
                <div className="bg-blue-50 text-blue-700 p-4 rounded-lg text-center">
                  {syncing && <Loader2 size={18} className="animate-spin inline mr-2" />}
                  {syncStatus}
                </div>
              )}

              <div className="flex gap-4 pt-4">
                <button
                  onClick={() => { setMode(null); setSelectedPeer(null); }}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  Retour
                </button>
                <button
                  onClick={handleSyncFromPeer}
                  disabled={!selectedPeer || syncing}
                  className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium text-white ${
                    !selectedPeer || syncing
                      ? 'bg-slate-300 cursor-not-allowed'
                      : 'bg-green-600 hover:bg-green-700'
                  }`}
                >
                  {syncing ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                  Demander la synchronisation
                </button>
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Informations de l'établissement</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'école</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Ex: ITP Mosala"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={schoolCity}
                  onChange={(e) => setSchoolCity(e.target.value)}
                  placeholder="Ex: Bandundu"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Boîte Postale</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={schoolPoBox}
                  onChange={(e) => setSchoolPoBox(e.target.value)}
                  placeholder="Ex: BP 213"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Année Scolaire</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Intitulé</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Création des Classes</h2>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-4 gap-2 items-end">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Niveau</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.level}
                    onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Option</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-100"
                    value={newClass.option}
                    onChange={(e) => setNewClass({ ...newClass, option: e.target.value })}
                    disabled={newClass.level === '7ème' || newClass.level === '8ème'}
                  >
                    {OPTIONS.filter(o => {
                      // 7ème/8ème: only EB
                      if (newClass.level === '7ème' || newClass.level === '8ème') return o.value === 'EB';
                      // 1ère-4ème: everything except EB
                      return o.value !== 'EB';
                    }).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Section</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  >
                    {/* Sans section not allowed for 7ème/8ème */}
                    {(newClass.level !== '7ème' && newClass.level !== '8ème') && <option value="-">Sans section</option>}
                    {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={addClass}
                  className="col-span-4 mt-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Ajouter la classe
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="p-3">Classe</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classes.map((c, i) => (
                      <tr key={i}>
                        <td className="p-3">
                          {getClassDisplayName(c.level, c.option, c.section)}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeClass(i)} className="text-red-500 hover:text-red-700">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {classes.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-6 text-center text-slate-400">
                          Aucune classe ajoutée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer - only show for steps 1-3 */}
        {step > 0 && (
          <div className="bg-slate-50 p-6 flex justify-between border-t border-slate-200">
            <button
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className={`px-4 py-2 rounded-lg font-medium ${
                step === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'
              }`}
            >
              Retour
            </button>
            <button
              onClick={handleNext}
              disabled={loading || (step === 3 && classes.length === 0)}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Configuration...' : step === 3 ? 'Terminer' : 'Suivant'}
              {!loading && step !== 3 && <ChevronRight size={18} />}
              {!loading && step === 3 && <Check size={18} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
