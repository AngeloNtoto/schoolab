/**
 * VoirBureauModal.tsx
 *
 * Modal dédié au marquage "Voir Bureau" (VB) pour la liste complète d'une classe.
 * Au lieu de passer par le modal de repêchage (matière par matière), on coche
 * simplement l'élève ici — le système marque TOUTES ses matières comme VB.
 *
 * Logique : un élève coché en VB = il a une dette et doit se présenter au bureau.
 * Son bulletin affichera "VB" à la place des points de repêchage dans toutes ses matières.
 */

import { useState, useEffect } from 'react';
import { X, Users, AlertTriangle } from '../iconsSvg';
import { useToast } from '../../context/ToastContext';
import { repechageService, Repechage } from '../../services/repechageService';
import { Student } from '../../services/studentService';
import { Subject } from '../../services/classService';

interface VoirBureauModalProps {
  isOpen: boolean;
  onClose: () => void;
  students: Student[];
  subjects: Subject[];
  classId: number;
}

export default function VoirBureauModal({
  isOpen,
  onClose,
  students,
  subjects,
}: VoirBureauModalProps) {
  // Map studentId -> true/false : l'élève est-il marqué VB ?
  const [vbStatus, setVbStatus] = useState<Map<number, boolean>>(new Map());
  // Suivi des opérations en cours (pour éviter les double-clics)
  const [loadingMap, setLoadingMap] = useState<Map<number, boolean>>(new Map());
  const [initialLoading, setInitialLoading] = useState(true);
  const toast = useToast();

  // Charger l'état VB de tous les élèves de la classe au montage du modal
  useEffect(() => {
    if (isOpen && students.length > 0 && subjects.length > 0) {
      loadAllVbStatuses();
    }
  }, [isOpen, students, subjects]);

  /**
   * Charge les repêchages de toute la classe et déduit le statut VB de chaque élève.
   * Un élève est considéré VB si AU MOINS UNE de ses matières a voir_bureau = 1.
   */
  const loadAllVbStatuses = async () => {
    setInitialLoading(true);
    try {
      // Charger les repêchages pour chaque élève
      const newStatus = new Map<number, boolean>();

      // On charge en parallèle pour être plus rapide
      await Promise.all(
        students.map(async (student) => {
          const repechages = await repechageService.getRepechagesByStudent(student.id);
          // VB = vrai si au moins une matière a voir_bureau activé
          const isVB = repechages.some((r: Repechage) => r.voir_bureau === 1);
          newStatus.set(student.id, isVB);
        })
      );

      setVbStatus(newStatus);
    } catch (error) {
      console.error('Erreur lors du chargement des statuts VB :', error);
      toast.error('Erreur lors du chargement des statuts Voir Bureau');
    } finally {
      setInitialLoading(false);
    }
  };

  /**
   * Bascule le statut VB d'un élève :
   * - Si on active VB → on marque TOUTES ses matières comme voir_bureau = 1
   * - Si on désactive VB → on retire voir_bureau de TOUTES ses matières
   */
  const handleToggleVB = async (student: Student) => {
    const currentVB = vbStatus.get(student.id) ?? false;
    const newVB = !currentVB;

    // Marquer cet élève comme "en cours" pour désactiver le bouton
    setLoadingMap(prev => new Map(prev).set(student.id, true));

    try {
      // Appliquer le changement sur toutes les matières de cet élève
      await Promise.all(
        subjects.map(subject =>
          repechageService.setVoirBureau(student.id, subject.id, newVB)
        )
      );

      // Mettre à jour l'état local immédiatement (optimiste)
      setVbStatus(prev => new Map(prev).set(student.id, newVB));

      toast.success(
        newVB
          ? `"Voir Bureau" activé pour ${student.first_name} ${student.last_name}`
          : `"Voir Bureau" désactivé pour ${student.first_name} ${student.last_name}`
      );
    } catch (error) {
      console.error('Erreur toggle VB :', error);
      toast.error('Erreur lors de la mise à jour du statut Voir Bureau');
    } finally {
      // Retirer l'indicateur de chargement
      setLoadingMap(prev => {
        const newMap = new Map(prev);
        newMap.delete(student.id);
        return newMap;
      });
    }
  };

  // Compter combien d'élèves sont marqués VB (pour l'info dans le header)
  const vbCount = [...vbStatus.values()].filter(Boolean).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 w-full max-w-xl flex flex-col max-h-[88vh] animate-in zoom-in-95 duration-300">

        {/* Header du modal */}
        <div className="bg-white dark:bg-slate-900 px-8 py-6 flex items-center justify-between shrink-0 border-b border-slate-100 dark:border-white/5">
          <div className="flex items-center gap-4">
            <div className="bg-amber-50 dark:bg-amber-500/10 p-3 rounded-2xl border border-amber-100 dark:border-amber-500/20">
              <Users size={22} className="text-amber-600 dark:text-amber-300" />
            </div>
            <div>
              <p className="text-amber-600 dark:text-amber-300 font-black uppercase tracking-widest text-[9px] mb-1">
                Administration
              </p>
              <h2 className="text-xl font-black text-slate-900 dark:text-white tracking-tight">
                Voir Bureau
                {vbCount > 0 && (
                  <span className="ml-2 text-sm bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-200 px-2 py-0.5 rounded-full">
                    {vbCount} élève{vbCount > 1 ? 's' : ''}
                  </span>
                )}
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:text-slate-500 dark:hover:text-slate-200 dark:hover:bg-slate-800 rounded-xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Bandeau d'explication */}
        <div className="px-6 py-3 bg-amber-50 dark:bg-amber-900/10 border-b border-amber-200 dark:border-amber-500/20 flex items-start gap-2 shrink-0">
          <AlertTriangle size={14} className="text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
          <p className="text-[11px] text-amber-700 dark:text-amber-300 font-medium leading-relaxed">
            Activer VB pour un élève marquera <strong>toutes ses matières</strong> comme
            "Voir Bureau". Dans le bulletin, "<strong>VB</strong>" s'affichera à la place de ses points de repêchage.
          </p>
        </div>

        {/* Liste des élèves */}
        <div className="flex-1 overflow-auto custom-scrollbar">
          {initialLoading ? (
            <div className="p-12 text-center text-slate-400">
              <div className="w-6 h-6 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              Chargement des statuts...
            </div>
          ) : students.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-sm">
              Aucun élève dans cette classe.
            </div>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-white/5">
              {students.map((student, index) => {
                const isVB = vbStatus.get(student.id) ?? false;
                const isLoading = loadingMap.get(student.id) ?? false;

                return (
                  <li
                    key={student.id}
                    className={`flex items-center justify-between px-6 py-3.5 transition-colors group ${
                      isVB
                        ? 'bg-amber-50/60 dark:bg-amber-900/10'
                        : 'bg-white dark:bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Numéro + nom de l'élève */}
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-[10px] font-black text-slate-300 dark:text-slate-600 w-5 text-right shrink-0">
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p className={`font-bold text-sm truncate ${
                          isVB
                            ? 'text-amber-700 dark:text-amber-300'
                            : 'text-slate-700 dark:text-slate-200'
                        }`}>
                          {student.last_name} {student.post_name} {student.first_name}
                        </p>
                        {/* Badge VB visible quand activé */}
                        {isVB && (
                          <span className="inline-flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded text-[9px] font-black uppercase tracking-widest">
                            VOIR BUREAU
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Toggle switch côté droit */}
                    <button
                      onClick={() => handleToggleVB(student)}
                      disabled={isLoading}
                      title={isVB ? 'Désactiver Voir Bureau' : 'Activer Voir Bureau'}
                      className={`relative w-11 h-6 rounded-full transition-all duration-300 ml-4 shrink-0 disabled:opacity-50 ${
                        isVB
                          ? 'bg-amber-500 shadow-amber-500/40 shadow-lg'
                          : 'bg-slate-200 dark:bg-slate-700'
                      }`}
                    >
                      {isLoading ? (
                        // Spinner pendant la sauvegarde
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin absolute top-[5px] left-[5px]" />
                      ) : (
                        // Cercle du toggle
                        <div
                          className={`w-4 h-4 bg-white rounded-full absolute top-[4px] shadow-sm transition-all duration-300 ${
                            isVB ? 'left-[24px]' : 'left-[4px]'
                          }`}
                        />
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/5 shrink-0 flex items-center justify-between bg-slate-50 dark:bg-slate-900/50">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            {vbCount} / {students.length} élève{students.length > 1 ? 's' : ''} marqué{vbCount > 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
