import React, { useState, useEffect, useActionState } from 'react';
import { dbService } from '../../services/databaseService';
import { useFormStatus } from 'react-dom';
import { X, BookOpen, Plus, Trash2 } from 'lucide-react';
import { domainService, Domain } from '../../services/domainService';
import { useToast } from '../../context/ToastContext';

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
  sub_domain?: string;
  category?: string;
}

interface AddSubjectModalProps {
  classId: number;
  classLevel: string;
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
  editingSubject?: Subject | null;
  onSelectSubject?: (subject: Subject) => void;
}

export default function AddSubjectModal({ classId, classLevel, subjects, onClose, onSuccess, editingSubject, onSelectSubject }: AddSubjectModalProps) {
  // Check if this is a primary class (7ème or 8ème) to show domain selection
  const isPrimaryClass = classLevel === '7ème' || classLevel === '8ème';
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [subDomain, setSubDomain] = useState('');
  const toast = useToast();
  
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

  // If editingSubject is provided, prefill the form
  useEffect(() => {
    if (editingSubject) {
      setName(editingSubject.name || '');
      setCode(editingSubject.code || '');
      setSubDomain(editingSubject.sub_domain || '');
      setMaxPeriod(String(editingSubject.max_p1 ?? '10'));
      // assume exam1 and exam2 are same
      setMaxExam(String(editingSubject.max_exam1 ?? '20'));
      setSelectedDomainId(editingSubject.domain_id ?? null);
    }
  }, [editingSubject]);

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
  // React 19 Action for subject saving
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      const sName = formData.get('name') as string;
      const sCode = formData.get('code') as string;
      const sSubDomain = formData.get('sub_domain') as string;
      const pMax = Number(formData.get('max_period'));
      
      // RÉCUPÉRATION DU MAXIMA D'EXAMEN :
      // Si période = 100 : forcer exam = 0 (sécurité)
      const examMax = pMax === 100 ? 0 : Number(formData.get('max_exam'));

      if (editingSubject) {
        await dbService.execute(
          'UPDATE subjects SET name = ?, code = ?, sub_domain = ?, max_p1 = ?, max_p2 = ?, max_exam1 = ?, max_p3 = ?, max_p4 = ?, max_exam2 = ?, domain_id = ? WHERE id = ?',
          [sName, sCode, sSubDomain, pMax, pMax, examMax, pMax, pMax, examMax, selectedDomainId, editingSubject.id]
        );
      } else {
        await dbService.execute(
          'INSERT INTO subjects (name, code, sub_domain, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [sName, sCode, sSubDomain, pMax, pMax, examMax, pMax, pMax, examMax, classId, selectedDomainId]
        );
      }
      
      // RÉINITIALISATION DU FORMULAIRE :
      setName('');
      setCode('');
      setSubDomain('');
      setMaxPeriod('10');
      setMaxExam('20');
      setSelectedDomainId(null);
      
      toast.success(editingSubject ? 'Matière mise à jour' : 'Matière ajoutée avec succès');
      onSuccess();
      return { success: true };
    } catch (error) {
      console.error('Failed to save subject:', error);
      toast.error('Erreur lors de l\'enregistrement de la matière');
      return { success: false };
    }
  }, null);

  const handleDelete = async (subjectId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette matière ? Toutes les notes associées seront perdues.')) return;
    
    try {
      await dbService.execute('DELETE FROM subjects WHERE id = ?', [subjectId]);
      
      onSuccess();
      toast.success('Matière supprimée');
    } catch (error) {
      console.error('Failed to delete subject:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/5 w-full max-w-3xl transform scale-100 animate-in fade-in zoom-in-95 duration-300">
        
        {/* Header section with blue gradient */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-6 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 right-0 p-8 text-white/5 rotate-12">
                <BookOpen size={120} />
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="bg-white/20 dark:bg-blue-600/30 p-3 rounded-2xl shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
                        <BookOpen size={24} className="text-white dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-blue-100 dark:text-blue-400/60 font-black uppercase tracking-[0.2em] text-[9px] mb-1">Portail de gestion</p>
                        <h2 className="text-xl font-black text-white dark:text-slate-100 tracking-tight">
                            Gérer les <span className="text-blue-200 dark:text-blue-500">matières</span>
                        </h2>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={16} />
                </button>
            </div>
        </div>

        <div className="p-6">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form Section (3/5) */}
            <div className="lg:col-span-3 space-y-6">
              <div className="flex items-center gap-3 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    {editingSubject ? 'Modifier la matière' : 'Nouvelle Matière'}
                </h3>
              </div>

              <form action={formAction} className="space-y-6">
                <div className={`grid ${isPrimaryClass ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-2'} gap-6`}>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Nom de la matière</label>
                        <input
                            name="name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                            placeholder="Ex: Mathématiques"
                            required
                        />
                    </div>
                    {!isPrimaryClass && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Code</label>
                            <input
                                name="code"
                                type="text"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                                placeholder="Ex: MATH"
                            />
                        </div>
                    )}
                </div>
                
                {isPrimaryClass && (
                    <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-white/5">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Domaine d'apprentissage</label>
                            {!showDomainCreate ? (
                                <div className="flex gap-3">
                                    <select
                                        value={selectedDomainId ?? ''}
                                        onChange={(e) => setSelectedDomainId(e.target.value ? Number(e.target.value) : null)}
                                        className="flex-1 px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all appearance-none"
                                    >
                                        <option value="">Aucun domaine</option>
                                        {domains.map(domain => (
                                            <option key={domain.id} value={domain.id}>{domain.name}</option>
                                        ))}
                                    </select>
                                </div>
                            ) : (
                                <div className="space-y-3 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-white/5 animate-in fade-in slide-in-from-top-2">
                                    <input
                                        type="text"
                                        value={newDomainName}
                                        onChange={(e) => setNewDomainName(e.target.value)}
                                        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold outline-none"
                                        placeholder="Nom du nouveau domaine"
                                    />
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCreateDomain}
                                            className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-colors"
                                        >
                                            Créer
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => {
                                                setShowDomainCreate(false);
                                                setNewDomainName('');
                                            }}
                                            className="flex-1 py-2 bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                                        >
                                            Annuler
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Sous-Domaine (Optionnel)</label>
                            <input
                                name="sub_domain"
                                type="text"
                                value={subDomain}
                                onChange={(e) => setSubDomain(e.target.value)}
                                className="w-full px-6 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                                placeholder="Ex: Algèbre"
                            />
                        </div>
                    </div>
                )}

                <div className="bg-slate-50/50 dark:bg-slate-900/30 p-5 rounded-2xl border border-slate-100 dark:border-white/5 shadow-inner space-y-4">
                    <div className="flex items-center gap-2 px-1">
                        <BookOpen size={12} className="text-blue-500" />
                        <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest">Configuration des Maxima</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Maxima Période</label>
                            <input
                                name="max_period"
                                type="number"
                                value={maxPeriod}
                                onChange={(e) => setMaxPeriod(e.target.value)}
                                className="w-full px-4 py-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                                min="1"
                                required
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Maxima Examen</label>
                            <input
                                name="max_exam"
                                type="number"
                                value={maxExam}
                                onChange={(e) => setMaxExam(e.target.value)}
                                disabled={is100PointCourse}
                                className={`w-full px-4 py-2 border rounded-xl text-sm font-bold focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm ${
                                    is100PointCourse 
                                        ? 'bg-slate-100 dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-white/5 cursor-not-allowed' 
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-100 dark:border-white/5'
                                }`}
                                min="0"
                            />
                        </div>
                    </div>

                    <div className={`p-3 rounded-xl border transition-all duration-500 flex items-center justify-between ${is100PointCourse ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/20' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-100 dark:border-blue-900/20'}`}>
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Total Semestriel</p>
                            <p className={`text-lg font-black ${is100PointCourse ? 'text-amber-600' : 'text-blue-600 dark:text-blue-400'}`}>
                                {Number(maxPeriod) * 2 + Number(maxExam)} <span className="text-[9px] uppercase">pts</span>
                            </p>
                        </div>
                        <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 text-right max-w-[120px]">
                            {is100PointCourse 
                                ? "Évaluation continue (sans examen)"
                                : `Calcul: ${maxPeriod} + ${maxPeriod} + ${maxExam}`}
                        </p>
                    </div>
                </div>

                <div className="flex gap-4">
                  <SubmitButton editingSubject={editingSubject} />
                  {editingSubject && (
                    <button
                      type="button"
                      onClick={() => handleDelete(editingSubject.id)}
                      className="p-5 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 rounded-2xl border border-red-100 dark:border-red-900/20 hover:bg-red-100 transition-colors active:scale-95"
                    >
                      <Trash2 size={20} />
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List Section (2/5) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Matières existantes</h3>
                </div>
                <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg text-[9px] font-black text-slate-500 dark:text-slate-400">{subjects.length}</span>
              </div>

              <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {subjects.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <BookOpen size={32} className="mx-auto text-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune matière configurée</p>
                  </div>
                ) : (
                  subjects.map(subject => {
                    const domain = subject.domain_id ? domains.find(d => d.id === subject.domain_id) : null;
                    const isActive = editingSubject?.id === subject.id;
                    return (
                      <div
                        key={subject.id}
                        onClick={() => onSelectSubject?.(subject)}
                        className={`group relative p-4 rounded-2xl border transition-all duration-300 cursor-pointer overflow-hidden ${
                            isActive 
                                ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'
                        }`}
                      >
                        {isActive && (
                            <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12">
                                <BookOpen size={64} />
                            </div>
                        )}
                        
                        <div className="relative z-10 flex items-center justify-between">
                            <div className="space-y-1">
                                <p className={`font-black tracking-tight ${isActive ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{subject.name}</p>
                                <div className="flex items-center gap-2">
                                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest ${isActive ? 'bg-white/20 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
                                        {subject.code || (isPrimaryClass ? 'PRIMAIRE' : 'NULL')}
                                    </span>
                                    <span className={`text-[9px] font-bold ${isActive ? 'text-blue-100' : 'text-slate-400 dark:text-slate-500'}`}>
                                        P:{subject.max_p1} • E:{subject.max_exam1}
                                    </span>
                                </div>
                                {domain && (
                                    <div className="flex flex-col gap-0.5">
                                        <p className={`text-[8px] font-black uppercase tracking-widest ${isActive ? 'text-blue-200' : 'text-blue-500 select-none'}`}>
                                            {domain.name}
                                        </p>
                                        {subject.sub_domain && (
                                            <p className={`text-[8px] font-bold ${isActive ? 'text-blue-300' : 'text-slate-400'}`}>
                                                ↳ {subject.sub_domain}
                                            </p>
                                        )}
                                    </div>
                                )}
                            </div>
                            
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDelete(subject.id); }}
                                className={`p-2 rounded-xl transition-all ${
                                    isActive 
                                        ? 'hover:bg-white/10 text-white' 
                                        : 'text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20'
                                }`}
                                title="Supprimer"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
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
/**
 * Bouton de soumission avec useFormStatus
 */
function SubmitButton({ editingSubject }: { editingSubject: Subject | null | undefined }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {pending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {pending ? 'Enregistrement...' : (editingSubject ? 'Enregistrer' : 'Ajouter la matière')}
    </button>
  );
}
