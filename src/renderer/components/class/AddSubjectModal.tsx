import React, { useState, useEffect, useActionState } from 'react';
import { dbService } from '../../services/databaseService';
import { useFormStatus } from 'react-dom';
import { X, BookOpen, Plus, Trash2, Sparkles, Layers, GripVertical, Check, Copy } from '../iconsSvg';
import { classService } from '../../services/classService';
import { domainService, Domain } from '../../services/domainService';
import { useToast } from '../../context/ToastContext';
import SubjectCatalog from './SubjectCatalog';
import CloneSubjects from './CloneSubjects';

// Définition des propriétés de notre zone d'interligne pour le dépôt
interface DropZoneProps {
  index: number;
  onDrop: (sourceId: number, targetIndex: number) => void;
}

// Composant représentant l'espace entre deux cours où l'on peut glisser-déposer
function DropZone({ index, onDrop }: DropZoneProps) {
  // Permet de savoir si un élément survolé est actuellement au-dessus
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setIsOver(true);
      }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsOver(false);
        // Récupère l'ID du cours stocké dans le dataTransfer
        const sourceIdStr = e.dataTransfer.getData('text/plain');
        if (sourceIdStr) {
          onDrop(Number(sourceIdStr), index);
        }
      }}
      // L'interligne s'agrandit légèrement pour faciliter le dépôt quand on passe dessus
      className={`transition-all duration-200 shrink-0 ${
        isOver 
          ? 'py-3' 
          : 'py-1.5'
      }`}
    >
      {/* Barre bleue lumineuse qui apparaît uniquement lors du survol */}
      <div 
        className={`h-1.5 rounded-full transition-all duration-200 ${
          isOver 
            ? 'bg-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.8)] scale-x-100' 
            : 'bg-transparent scale-x-0'
        }`}
      />
    </div>
  );
}

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

  // Onglet actif : 'catalog' pour parcourir le catalogue, 'manual' pour saisie libre, 'clone' pour cloner
  // Par défaut on affiche le catalogue sauf si on est en mode édition
  const [activeTab, setActiveTab] = useState<'catalog' | 'manual' | 'clone' | 'batch'>(editingSubject ? 'manual' : 'catalog');
  
  // Domain-related state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<number | null>(null);
  const [showDomainCreate, setShowDomainCreate] = useState(false);
  const [newDomainName, setNewDomainName] = useState('');
  
  // Batch Mode states
  const [batchSubjects, setBatchSubjects] = useState<{name: string, code: string}[]>([]);
  const [batchInputName, setBatchInputName] = useState('');
  const [batchInputCode, setBatchInputCode] = useState('');

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
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData): Promise<any> => {
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
          [sName, sCode || '', sSubDomain, pMax, pMax, examMax, pMax, pMax, examMax, selectedDomainId, editingSubject.id]
        );
      } else {
        // If in batch mode, we handle saving multiple
        if (activeTab === 'batch') {
          if (batchSubjects.length === 0) {
            toast.warning('Ajoutez au moins un cours à la liste');
            return { success: false };
          }
          let order = subjects.length + 1;
          for (const item of batchSubjects) {
             await dbService.execute(
               'INSERT INTO subjects (name, code, sub_domain, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
               [item.name, item.code, '', pMax, pMax, examMax, pMax, pMax, examMax, classId, selectedDomainId, order]
             );
             order++;
          }
        } else {
          await dbService.execute(
            'INSERT INTO subjects (name, code, sub_domain, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [sName, sCode || '', sSubDomain, pMax, pMax, examMax, pMax, pMax, examMax, classId, selectedDomainId]
          );
        }
      }
      
      toast.success(editingSubject ? 'Matière mise à jour' : (activeTab === 'batch' ? `${batchSubjects.length} matières ajoutées` : 'Matière ajoutée'));
      onSuccess();
      
      if (!editingSubject && activeTab !== 'batch') {
        setName('');
        setCode('');
      } else if (activeTab === 'batch') {
        setBatchSubjects([]);
      } else {
        onClose();
      }
      return { success: true };
    } catch (error) {
      console.error('Failed to save subject:', error);
      toast.error('Erreur lors de l\'enregistrement de la matière');
      return { success: false };
    }
  }, null);

  const handleDelete = async (subjectId: number) => {
    // Confirmation via modal personnalisé au lieu du confirm() du navigateur
    const confirmed = await toast.confirm({
      title: 'Supprimer la matière',
      message: 'Toutes les notes associées seront perdues. Cette action est irréversible.',
      confirmLabel: 'Supprimer',
      cancelLabel: 'Annuler',
      variant: 'danger'
    });
    if (!confirmed) return;
    
    try {
      await dbService.execute('DELETE FROM subjects WHERE id = ?', [subjectId]);
      
      onSuccess();
      toast.success('Matière supprimée');
    } catch (error) {
      console.error('Failed to delete subject:', error);
      toast.error('Erreur lors de la suppression');
    }
  };



  // ── Auto-Trier ──
  const handleAutoSort = async () => {
    // Trier par maxima (plus petit au plus grand), puis par nom (A-Z)
    const sorted = [...subjects].sort((a, b) => {
      if (a.max_p1 !== b.max_p1) return a.max_p1 - b.max_p1;
      return a.name.localeCompare(b.name);
    });

    const ids = sorted.map(s => s.id);
    try {
      await classService.reorderSubjects(ids);
      toast.success('Cours triés automatiquement');
      onSuccess();
    } catch (error) {
      console.error('Erreur auto-tri:', error);
      toast.error('Erreur lors du tri automatique');
    }
  };

  // // ── HTML5 Drag & Drop ──
  // const [draggedId, setDraggedId] = React.useState<number | null>(null);

// On utilise une référence pour garder la trace du ghost en mémoire
const ghostRef = React.useRef<HTMLDivElement | null>(null);
const [draggedId, setDraggedId] = React.useState<number | null>(null);

const handleDragStart = (e: React.DragEvent, id: number, name: string) => {
  setDraggedId(id);
  e.dataTransfer.setData('text/plain', id.toString());
  e.dataTransfer.effectAllowed = 'move';
  
  // 1. Création du badge flottant
  const dragGhost = document.createElement('div');
  
  // FIX WINDOWS : On le place au top/left 0 pour qu'il soit dans le viewport,
  // mais on le pousse DERRIÈRE l'application avec un z-index négatif.
  dragGhost.style.position = 'fixed';
  dragGhost.style.top = '0';
  dragGhost.style.left = '0';
  dragGhost.style.zIndex = '-1000'; 
  dragGhost.style.pointerEvents = 'none'; // Évite de bloquer les interactions utilisateur
  
  // Votre style visuel
  dragGhost.style.background = '#2563eb';
  dragGhost.style.color = 'white';
  dragGhost.style.padding = '4px 12px';
  dragGhost.style.borderRadius = '8px';
  dragGhost.style.fontSize = '12px';
  dragGhost.style.fontWeight = 'bold';
  dragGhost.textContent = `Déplacer : ${name}`;
  
  document.body.appendChild(dragGhost);
  ghostRef.current = dragGhost; // On stocke l'élément pour le nettoyer plus tard
  
  // Assigne le ghost (décalage de 10px par rapport au curseur)
  e.dataTransfer.setDragImage(dragGhost, 10, 10);
};

// 2. Le nettoyeur officiel
const handleDragEnd = () => {
  // On retire le ghost du DOM dès que l'utilisateur lâche la souris
  if (ghostRef.current && ghostRef.current.parentNode) {
    ghostRef.current.parentNode.removeChild(ghostRef.current);
    ghostRef.current = null;
  }
  setDraggedId(null);
};

  // Traitement du drop sur une interligne
  const handleDropOnZone = async (sourceId: number, targetIndex: number) => {
    const ids = subjects.map(s => s.id);
    const fromIdx = ids.indexOf(sourceId);
    if (fromIdx === -1) return;
    
    // On retire le cours de sa position d'origine
    ids.splice(fromIdx, 1);
    
    // On calcule sa nouvelle place dans le tableau
    let insertIdx = targetIndex;
    if (fromIdx < targetIndex) {
      insertIdx = targetIndex - 1;
    }
    
    ids.splice(insertIdx, 0, sourceId);
    
    try {
      await classService.reorderSubjects(ids);
      toast.success('Ordre mis à jour');
      onSuccess();
    } catch (error) {
      console.error('Erreur réorganisation:', error);
      toast.error('Erreur lors de la réorganisation');
    }
    setDraggedId(null);
  };

  // ── Mode suppression multiple ──
  const [multiDeleteMode, setMultiDeleteMode] = React.useState(false);
  const [deletingIds, setDeletingIds] = React.useState<Set<number>>(new Set());

  // Toggle sélection d'un cours pour suppression
  const toggleDeleteId = (id: number) => {
    setDeletingIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Supprimer tous les cours sélectionnés
  const handleMultiDelete = async () => {
    if (deletingIds.size === 0) return;
    try {
      for (const id of deletingIds) {
        await dbService.execute('DELETE FROM subjects WHERE id = ?', [id]);
        await dbService.execute('DELETE FROM grades WHERE subject_id = ?', [id]);
      }
      toast.success(`${deletingIds.size} matière${deletingIds.size > 1 ? 's' : ''} supprimée${deletingIds.size > 1 ? 's' : ''}`);
      setDeletingIds(new Set());
      setMultiDeleteMode(false);
      onSuccess();
    } catch (error) {
      console.error('Erreur suppression multiple:', error);
      toast.error('Erreur lors de la suppression');
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/5 w-full max-w-5xl transform scale-100 animate-in fade-in zoom-in-95 duration-300 max-h-[90vh] flex flex-col">
        
        {/* Header section with blue gradient */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-6 relative overflow-hidden transition-colors duration-500 shrink-0">
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

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form Section (3/5) — avec onglets Catalogue / Manuel */}
            <div className="lg:col-span-3 space-y-4">
              {/* Onglets Catalogue / Manuel */}
              {!editingSubject && (
                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setActiveTab('catalog')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === 'catalog'
                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Layers size={14} />
                    Catalogue
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('manual')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === 'manual'
                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Plus size={14} />
                    Saisie manuelle
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('clone')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === 'clone'
                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Copy size={14} />
                    Cloner
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab('batch')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all ${
                      activeTab === 'batch'
                        ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Sparkles size={14} />
                    Par Maxima
                  </button>
                </div>
              )}

              {/* Titre de section : mode édition */}
              {editingSubject && (
                <div className="flex items-center gap-3 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                  <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                    Modifier la matière
                  </h3>
                </div>
              )}

              {/* CONTENU : Catalogue, Clonage ou Manuel */}
              {activeTab === 'catalog' && !editingSubject ? (
                <SubjectCatalog
                  classId={classId}
                  classLevel={classLevel}
                  existingSubjectNames={subjects.map(s => s.name)}
                  onSuccess={onSuccess}
                />
              ) : activeTab === 'clone' && !editingSubject ? (
                <CloneSubjects classId={classId} onSuccess={onSuccess} />
              ) : (
                <>
                  {!editingSubject && (
                    <div className="flex items-center gap-3 px-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                      <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
                        Nouvelle Matière
                      </h3>
                    </div>
                  )}

              <form action={formAction} className="space-y-6">
                {activeTab === 'batch' ? (
                  <div className="space-y-4 bg-blue-50/50 dark:bg-blue-900/10 p-5 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                     <div className="flex flex-col sm:flex-row gap-4 items-end">
                       <div className="space-y-2 flex-[2]">
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">Nom de la matière</label>
                          <input 
                              type="text" 
                              value={batchInputName} 
                              onChange={(e) => setBatchInputName(e.target.value)} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                   e.preventDefault();
                                   if (batchInputName.trim()) {
                                      setBatchSubjects([...batchSubjects, {name: batchInputName.trim(), code: batchInputCode.trim()}]);
                                      setBatchInputName('');
                                      setBatchInputCode('');
                                   }
                                }
                              }}
                              className="w-full px-6 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                              placeholder="Ex: Chimie"
                          />
                       </div>
                       <div className="space-y-2 flex-1">
                          <label className="text-[10px] font-black text-blue-500 uppercase tracking-widest px-1">Code (Opt)</label>
                          <input 
                              type="text" 
                              value={batchInputCode} 
                              onChange={(e) => setBatchInputCode(e.target.value.toUpperCase())} 
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                   e.preventDefault();
                                   if (batchInputName.trim()) {
                                      setBatchSubjects([...batchSubjects, {name: batchInputName.trim(), code: batchInputCode.trim()}]);
                                      setBatchInputName('');
                                      setBatchInputCode('');
                                   }
                                }
                              }}
                              className="w-full px-6 py-4 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-sm"
                              placeholder="CHIM"
                          />
                       </div>
                       <button 
                          type="button" 
                          onClick={() => {
                             if (batchInputName.trim()) {
                                setBatchSubjects([...batchSubjects, {name: batchInputName.trim(), code: batchInputCode.trim()}]);
                                setBatchInputName('');
                                setBatchInputCode('');
                             }
                          }}
                          className="px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-blue-500/30 transition-all active:scale-95 flex items-center gap-2"
                       >
                         <Plus size={16} />
                       </button>
                     </div>

                     {/* Pending List */}
                     {batchSubjects.length > 0 && (
                        <div className="mt-4">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 mb-2 block">
                                File d'attente ({batchSubjects.length} cours)
                            </label>
                            <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-white/5 p-3 space-y-2 max-h-[180px] overflow-y-auto custom-scrollbar">
                                {batchSubjects.map((item, idx) => (
                                    <div key={idx} className="flex items-center justify-between bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-white/5 shadow-sm">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                          {item.code && <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2 py-0.5 rounded-md">{item.code}</span>}
                                        </div>
                                        <button type="button" onClick={() => setBatchSubjects(batchSubjects.filter((_, i) => i !== idx))} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                     )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Nom de la matière</label>
                          <input
                              name="name"
                              type="text"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-2xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner"
                              placeholder="Ex: Mathématiques"
                              required={activeTab === 'manual'}
                          />
                      </div>
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
                  </div>
                )}
                
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
              </>
              )}
            </div>

            {/* List Section (2/5) */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-3">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                    <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Matières existantes</h3>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleAutoSort}
                    className="text-[9px] font-bold px-2 py-1 rounded-lg bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-all flex items-center gap-1"
                    title="Trier par maxima puis A-Z"
                  >
                    <Sparkles size={10} />
                    Auto-trier
                  </button>
                  {/* Bouton pour activer/désactiver le mode suppression multiple */}
                  <button
                    onClick={() => {
                      setMultiDeleteMode(!multiDeleteMode);
                      setDeletingIds(new Set());
                    }}
                    className={`text-[9px] font-bold px-2 py-1 rounded-lg transition-all ${
                      multiDeleteMode
                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'
                        : 'bg-slate-100 text-slate-500 hover:text-red-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {multiDeleteMode ? 'Annuler' : 'Sélectionner'}
                  </button>
                  {/* Bouton supprimer la sélection */}
                  {multiDeleteMode && deletingIds.size > 0 && (
                    <button
                      onClick={handleMultiDelete}
                      className="text-[9px] font-black px-2 py-1 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-all flex items-center gap-1"
                    >
                      <Trash2 size={10} />
                      Supprimer ({deletingIds.size})
                    </button>
                  )}
                  <span className="bg-slate-100 dark:bg-slate-900 px-2 py-0.5 rounded-lg text-[9px] font-black text-slate-500 dark:text-slate-400">{subjects.length}</span>
                </div>
              </div>

              <div className="flex flex-col gap-0 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                {subjects.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <BookOpen size={32} className="mx-auto text-slate-200" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Aucune matière configurée</p>
                  </div>
                ) : (
                  <>
                    <DropZone index={0} onDrop={handleDropOnZone} />
                    {subjects.map((subject, idx) => {
                      const domain = subject.domain_id ? domains.find(d => d.id === subject.domain_id) : null;
                      const isActive = editingSubject?.id === subject.id;
                      return (
                        <React.Fragment key={subject.id}>
                          <div
                            draggable={!multiDeleteMode}
                            onDragStart={(e) => handleDragStart(e, subject.id, subject.name)}
                            onDragEnd={() => { setDraggedId(null); }}
                            onClick={() => {
                              // Mode suppression multiple : toggle la sélection
                              if (multiDeleteMode) {
                                toggleDeleteId(subject.id);
                                return;
                              }
                              // Mode normal : ouvrir l'édition
                              onSelectSubject?.(subject);
                            }}
                            className={`group relative shrink-0 py-3 px-4 rounded-2xl border-2 transition-all duration-200 cursor-grab active:cursor-grabbing overflow-hidden ${
                                 multiDeleteMode && deletingIds.has(subject.id)
                                    ? 'bg-red-50 dark:bg-red-900/10 border-red-400 dark:border-red-500 ring-2 ring-red-200 dark:ring-red-800'
                                    : draggedId === subject.id
                                        ? 'bg-slate-100 dark:bg-slate-800 border-dashed border-slate-300 dark:border-slate-600 opacity-50' // Visual feedback for dragged item
                                        : isActive 
                                            ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20' 
                                            : 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-white/5 hover:border-blue-400 dark:hover:border-blue-500 hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-none'
                            }`}
                          >
                        {isActive && !multiDeleteMode && (
                            <div className="absolute top-0 right-0 p-4 opacity-20 rotate-12">
                                <BookOpen size={64} />
                            </div>
                        )}
                        
                        <div className="relative z-10 flex items-start justify-between gap-3">
                            {/* Checkbox visible en mode multiDelete */}
                            {multiDeleteMode && (
                              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all shrink-0 self-start mt-0.5 ${
                                deletingIds.has(subject.id)
                                  ? 'bg-red-500 border-red-500 text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}>
                                {deletingIds.has(subject.id) && <Check size={12} />}
                              </div>
                            )}
                            
                            <div className="space-y-1 flex-1">
                                <p className={`font-black tracking-tight ${isActive && !multiDeleteMode ? 'text-white' : 'text-slate-800 dark:text-slate-200'}`}>{subject.name}</p>
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
                            
                            {/* Bouton de suppression */}
                            <div className="flex items-center gap-1 self-start mt-0.5 shrink-0">
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
                      </div>
                      <DropZone index={idx + 1} onDrop={handleDropOnZone} />
                    </React.Fragment>
                  );
                })}
              </>
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
