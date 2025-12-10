import React, { useState, useEffect, useRef } from 'react';
import { X, BookOpen, Plus, Trash2 } from 'lucide-react';
import { domainService, Domain } from '../services/domainService';
import { useToast } from '../context/ToastContext';

interface Subject {
  id: number;
  name: string;
  code: string;
  max_p1: number;
  max_p2: number;
  max_exam1: number;
  max_p3: number;
  max_p4: number;
  max_exam2: number;
  domain_id?: number;
}

interface AddSubjectModalProps {
  classId: number;
  classLevel: string;
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubjectModal({ classId, classLevel, subjects, onClose, onSuccess }: AddSubjectModalProps) {
  // Check if this is a primary class (7ème or 8ème) to show domain selection
  const isPrimaryClass = classLevel === '7ème' || classLevel === '8ème';
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const toast = useToast();
  // 1) État local pour refléter instantanément les changements
const [localSubjects, setLocalSubjects] = useState<Subject[]>(subjects);

useEffect(() => {
  setLocalSubjects(subjects);
}, [subjects]);

  
  // ÉTATS POUR LES MAXIMA
  const [maxPeriod, setMaxPeriod] = useState('10');
  const [maxExam, setMaxExam] = useState('20');  // Un seul champ pour les deux examens
  
  const [loading, setLoading] = useState(false);
  
  // Domain-related state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [showDomainCreate, setShowDomainCreate] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');

  // LOGIQUE SPÉCIALE POUR LES COURS À 100 POINTS :
  // Si maxPeriod = 100, alors c'est un cours en évaluation continue
  // sans examen (max_exam = 0 et champs désactivés)
  const is100PointCourse = Number(maxPeriod) === 100;

  useEffect(() => {
    loadDomains();
  }, []);

  // EFFET : Mise à jour automatique des examens quand la période change
  // Si période = 100 → examen = 0 (bloqué)
  // Sinon → examen = période * 2 (suggéré, mais modifiable)
  useEffect(() => {
    const pMax = Number(maxPeriod);
    if (pMax === 100) {
      // CAS SPÉCIAL : Évaluation continue, pas d'examen
      setMaxExam('0');
    } else {
      // CAS NORMAL : Suggestion du double de la période
      // L'utilisateur peut toujours modifier cette valeur
      setMaxExam((pMax * 2).toString());
    }
  }, [maxPeriod]);

  const loadDomains = async () => {
    try {
      const allDomains = await domainService.getAllDomains();
      setDomains(allDomains);
    } catch (error) {
      console.error('Failed to load domains:', error);
    }
  };

  // Ref pour le premier champ afin de forcer le focus (évite le cas où l'input devient non éditable jusqu'à switch de fenêtre)
  const nameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Focus à l'ouverture et après changements de la liste de matières
    const doFocus = () => {
      try { nameInputRef.current?.focus(); } catch (e) { console.debug('focus failed', e); }
    };

    // focus immediately (next tick) and also after a short delay to survive re-renders
    const t1 = setTimeout(doFocus, 0);
    const t2 = setTimeout(doFocus, 50);

    const handler = () => {
      // When db:changed happens, schedule focus after re-render
      const t3 = setTimeout(doFocus, 30);
      setTimeout(() => clearTimeout(t3), 1000);
    };

    window.addEventListener('db:changed', handler as EventListener);
    return () => {
      window.removeEventListener('db:changed', handler as EventListener);
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, []);

  // Si la prop subjects change, forcer le focus après le re-render
  useEffect(() => {
    const t = setTimeout(() => {
      try { nameInputRef.current?.focus(); } catch (e) { console.debug('focus failed', e); }
    }, 20);
    return () => clearTimeout(t);
  }, [subjects]);

  const handleCreateDomain = async () => {
    if (!newDomainName.trim()) return;

    try {
      const newId = await domainService.createDomain(newDomainName.trim());
      await loadDomains();
      setSelectedDomainId(newId);
      setNewDomainName('');
      setShowDomainCreate(false);
      toast.success('Domaine créé avec succès');
    } catch (error) {
      console.error('Failed to create domain:', error);
      toast.error('Erreur lors de la création du domaine');
    }
  };

  /**
   * GESTION DE LA SOUMISSION DU FORMULAIRE
   * 
   * Un seul maxima d'examen est utilisé pour les deux semestres
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const pMax = Number(maxPeriod);
      
      // RÉCUPÉRATION DU MAXIMA D'EXAMEN :
      // Si période = 100 : forcer exam = 0 (sécurité)
      // Sinon : utiliser la valeur saisie (même valeur pour les 2 semestres)
      const examMax = pMax === 100 ? 0 : Number(maxExam);

      // INSERTION EN BDD :
      // maxExam est utilisé pour exam1 ET exam2
      await window.api.db.execute(
        'INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        [name, code, pMax, pMax, examMax, pMax, pMax, examMax, classId, selectedDomainId]
      );
      
      // RÉINITIALISATION DU FORMULAIRE :
      setName('');
      setCode('');
      setMaxPeriod('10');
      setMaxExam('20');
      setSelectedDomainId(null);
      
      // Notify other components that DB changed (subject added)
      try {
        console.debug('[AddSubjectModal] dispatch db:changed subjectAdded', { classId });
        window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId } }));
      } catch (e) {
        console.error('Failed to dispatch db:changed (subjectAdded)', e);
      }

      onSuccess();
      toast.success('Matière ajoutée avec succès');
    } catch (error) {
      console.error('Failed to add subject:', error);
      toast.error('Erreur lors de l\'ajout de la matière');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subjectId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette matière ? Toutes les notes associées seront perdues.')) return;

    try {
      await window.api.db.execute('DELETE FROM subjects WHERE id = ?', [subjectId]);
      // 2) Mise à jour locale immédiate (anti-latence)
setLocalSubjects(prev => prev.filter(s => s.id !== subjectId));

      // Notify other components that DB changed (subject deleted)
      try {
        console.debug('[AddSubjectModal] dispatch db:changed subjectDeleted', { classId, subjectId });
        window.dispatchEvent(new CustomEvent('db:changed', { detail: { classId } }));
      } catch (e) {
        console.error('Failed to dispatch db:changed (subjectDeleted)', e);
      }
      onSuccess();
      toast.success('Matière supprimée');
    } catch (error) {
      console.error('Failed to delete subject:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Gérer les Matières</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Add Form */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={18} />
                Nouvelle Matière
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom de la matière <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    ref={nameInputRef}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Mathématiques"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: MATH"
                  />
                </div>
                
                {/* Domain Selection - Only for 7ème and 8ème */}
                {isPrimaryClass && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Domaine (optionnel)
                  </label>
                  {!showDomainCreate ? (
                    <div className="flex gap-2">
                      <select
                        value={selectedDomainId ?? ''}
                        onChange={(e) => setSelectedDomainId(e.target.value ? Number(e.target.value) : null)}
                        className="flex-1 px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none min-w-0 max-w-[200px] truncate"
                      >
                        <option value="">Aucun domaine</option>
                        {domains.map(domain => (
                          <option key={domain.id} value={domain.id} className="truncate">{domain.name}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => setShowDomainCreate(true)}
                        className="px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
                        title="Créer un nouveau domaine"
                      >
                        <Plus size={18} />
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={newDomainName}
                        onChange={(e) => setNewDomainName(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                        placeholder="Nom du nouveau domaine"
                      />
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={handleCreateDomain}
                          className="flex-1 px-3 py-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                        >
                          Créer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowDomainCreate(false);
                            setNewDomainName('');
                          }}
                          className="flex-1 px-3 py-1.5 bg-slate-300 text-slate-700 rounded-lg hover:bg-slate-400 text-sm"
                        >
                          Annuler
                        </button>
                      </div>
                    </div>
                  )}
                  <p className="text-xs text-slate-500 mt-1">Les domaines sont utilisés pour les classes de 7ème et 8ème</p>
                </div>
                )}

                {/* Maxima Section - PERSONNALISABLE */}
                <div className="space-y-4">
                  <h4 className="font-medium text-slate-800 border-b pb-1">Configuration des Maxima</h4>
                  
                  {/* Maxima Période */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Maxima Période <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      value={maxPeriod}
                      onChange={(e) => setMaxPeriod(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      min="1"
                      required
                    />
                    {/* INDICATEUR VISUEL pour cours à 100 points */}
                    {is100PointCourse && (
                      <p className="text-xs text-amber-600 mt-1 font-medium flex items-center gap-1">
                        <span>⚠️</span>
                        Évaluation continue : ce cours n'aura pas d'examen
                      </p>
                    )}
                  </div>

                  {/* Maxima Examen - UN SEUL CHAMP pour les deux semestres */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Maxima Examen
                    </label>
                    <input
                      type="number"
                      value={maxExam}
                      onChange={(e) => setMaxExam(e.target.value)}
                      disabled={is100PointCourse}
                      className={
                        is100PointCourse 
                          ? 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed' 
                          : 'w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-colors border-slate-300'
                      }
                      min="0"
                    />
                    <p className="text-xs text-slate-500 mt-1">
                      {is100PointCourse 
                        ? 'Automatiquement à 0 pour les cours à 100 points'
                        : 'Ce maxima sera utilisé pour les examens des deux semestres'
                      }
                    </p>
                  </div>

                  {/* Résumé des Totaux */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                    <p className="text-sm font-medium text-blue-900 mb-1">Total par semestre :</p>
                    <div className="text-xs text-blue-700">
                      <p>{Number(maxPeriod) * 2 + Number(maxExam)} points ({Number(maxPeriod)} + {Number(maxPeriod)} + {Number(maxExam)})</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Ajout...' : 'Ajouter la matière'}
                </button>
              </form>
            </div>

            {/* List */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">Matières existantes ({subjects.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {subjects.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Aucune matière configurée.</p>
                ) : (
                  subjects.map(subject => {
                    const domain = subject.domain_id ? domains.find(d => d.id === subject.domain_id) : null;
                    return (
                      <div key={subject.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors group">
                        <div>
                          <p className="font-medium text-slate-800">{subject.name}</p>
                          <p className="text-xs text-slate-500">
                            Code: {subject.code || '-'} • P:{subject.max_p1} Ex:{subject.max_exam1}
                            {domain && ` • ${domain.name}`}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDelete(subject.id)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                          title="Supprimer"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
