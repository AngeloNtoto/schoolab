/**
 * SubjectCatalog.tsx
 * 
 * Composant catalogue de cours pré-définis.
 * - Pour l'Éducation de Base (7ème/8ème) : cours organisés par domaine/sous-domaine
 * - Pour les Humanités (1ère-4ème) : cours organisés par catégorie
 * 
 * L'utilisateur coche les cours souhaités, puis clique "Ajouter la sélection"
 * pour les insérer en masse dans la classe.
 */

import React, { useState, useMemo } from 'react';
import { Check, BookOpen, Plus, Layers, Sparkles } from '../iconsSvg';
import {
  EB_COURSE_CATALOG,
  HUMANITIES_COURSE_CATALOG,
  CatalogCourse,
  CatalogGroup,
  CatalogCategory,
} from '../../../constants/school';
import { dbService } from '../../services/databaseService';
import { domainService } from '../../services/domainService';
import { useToast } from '../../context/ToastContext';

interface SubjectCatalogProps {
  classId: number;
  classLevel: string;
  existingSubjectNames: string[];  // noms des cours déjà existants (pour griser)
  onSuccess: () => void;           // appelé après ajout pour rafraîchir la liste
}

/** Identifiant unique pour chaque cours dans le catalogue */
type CourseKey = string;

// Génère une clé unique pour un cours
const courseKey = (groupLabel: string, course: CatalogCourse): CourseKey =>
  `${groupLabel}::${course.name}`;

export default function SubjectCatalog({
  classId,
  classLevel,
  existingSubjectNames,
  onSuccess,
}: SubjectCatalogProps) {
  const toast = useToast();

  // On détermine le type de catalogue à afficher
  const isPrimary = classLevel === '7ème' || classLevel === '8ème';

  // État : cours cochés par l'utilisateur (clés uniques)
  const [selected, setSelected] = useState<Set<CourseKey>>(new Set());
  const [isAdding, setIsAdding] = useState(false);

  // Normalise les noms existants pour la comparaison insensible à la casse
  const existingNamesLower = useMemo(
    () => new Set(existingSubjectNames.map(n => n.toLowerCase())),
    [existingSubjectNames]
  );

  // Vérifie si un cours existe déjà dans la classe
  const alreadyExists = (name: string) => existingNamesLower.has(name.toLowerCase());

  // Toggle la sélection d'un cours
  const toggleCourse = (key: CourseKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  // Sélectionner/désélectionner tout un groupe
  const toggleGroup = (groupLabel: string, courses: CatalogCourse[]) => {
    const keys = courses.filter(c => !alreadyExists(c.name)).map(c => courseKey(groupLabel, c));
    const allSelected = keys.every(k => selected.has(k));

    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        // Tout désélectionner
        keys.forEach(k => next.delete(k));
      } else {
        // Tout sélectionner
        keys.forEach(k => next.add(k));
      }
      return next;
    });
  };

  // Retrouve le cours à partir de sa clé
  const findCourse = (key: CourseKey): { course: CatalogCourse; domain?: string; subdomain?: string } | null => {
    // Chercher dans le catalogue EB
    for (const group of EB_COURSE_CATALOG) {
      for (const course of group.courses) {
        if (courseKey(group.subdomain, course) === key) {
          return { course, domain: group.domain, subdomain: group.subdomain };
        }
      }
    }
    // Chercher dans le catalogue Humanités
    for (const cat of HUMANITIES_COURSE_CATALOG) {
      for (const course of cat.courses) {
        if (courseKey(cat.category, course) === key) {
          return { course };
        }
      }
    }
    return null;
  };

  // Ajouter tous les cours sélectionnés en base de données
  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    setIsAdding(true);

    try {
      let addedCount = 0;

      for (const key of selected) {
        const found = findCourse(key);
        if (!found) continue;

        const { course, domain, subdomain } = found;

        // Vérifier si le cours existe déjà (double sécurité)
        if (alreadyExists(course.name)) continue;

        // Pour l'EB : résoudre le domain_id depuis la table domains
        let domainId: number | null = null;
        if (isPrimary && domain) {
          try {
            const domResult = await dbService.query<{ id: number }>(
              'SELECT id FROM domains WHERE name = ?',
              [domain]
            );
            if (domResult.length > 0) {
              domainId = domResult[0].id;
            } else {
              // Créer le domaine s'il n'existe pas encore
              const newId = await domainService.createDomain(domain);
              domainId = newId;
            }
          } catch {
            // Si on ne peut pas résoudre le domaine, on continue sans
            console.warn(`Domaine "${domain}" non résolu`);
          }
        }

        // Insérer le cours dans la base de données
        // max_period = même valeur pour P1, P2, P3, P4
        // max_exam = même valeur pour EXAM1 et EXAM2
        await dbService.execute(
          `INSERT INTO subjects (name, code, sub_domain, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id, is_dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            course.name,
            course.code,
            subdomain || '',
            course.max_period,
            course.max_period,
            course.max_exam,
            course.max_period,
            course.max_period,
            course.max_exam,
            classId,
            domainId,
          ]
        );
        addedCount++;
      }

      setSelected(new Set());
      toast.success(`${addedCount} cours ajouté${addedCount > 1 ? 's' : ''} avec succès`);
      onSuccess();
    } catch (error) {
      console.error('Erreur ajout catalogue:', error);
      toast.error("Erreur lors de l'ajout des cours");
    } finally {
      setIsAdding(false);
    }
  };

  // Sélectionner tous les cours non-existants d'un coup
  const handleSelectAll = () => {
    const allKeys = new Set<CourseKey>();
    if (isPrimary) {
      EB_COURSE_CATALOG.forEach(group => {
        group.courses.forEach(c => {
          if (!alreadyExists(c.name)) allKeys.add(courseKey(group.subdomain, c));
        });
      });
    } else {
      HUMANITIES_COURSE_CATALOG.forEach(cat => {
        cat.courses.forEach(c => {
          if (!alreadyExists(c.name)) allKeys.add(courseKey(cat.category, c));
        });
      });
    }
    setSelected(allKeys);
  };

  // Désélectionner tout
  const handleDeselectAll = () => setSelected(new Set());

  // ==================================================================
  // RENDU : Éducation de Base (par domaine/sous-domaine)
  // ==================================================================
  const renderEBCatalog = () => (
    <div className="space-y-4">
      {EB_COURSE_CATALOG.map((group) => {
        const availableCourses = group.courses.filter(c => !alreadyExists(c.name));
        const groupKeys = availableCourses.map(c => courseKey(group.subdomain, c));
        const allGroupSelected = groupKeys.length > 0 && groupKeys.every(k => selected.has(k));
        const someGroupSelected = groupKeys.some(k => selected.has(k));

        return (
          <div key={group.subdomain} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            {/* En-tête du groupe avec checkbox "tout sélectionner" */}
            <button
              type="button"
              onClick={() => toggleGroup(group.subdomain, group.courses)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              {/* Checkbox du groupe */}
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                allGroupSelected
                  ? 'bg-blue-600 border-blue-600'
                  : someGroupSelected
                    ? 'bg-blue-200 border-blue-400'
                    : 'border-slate-300 dark:border-slate-600'
              }`}>
                {(allGroupSelected || someGroupSelected) && <Check size={12} className="text-white" />}
              </div>

              <div className="text-left flex-1 min-w-0">
                {/* Nom du domaine en petit */}
                <p className="text-[8px] font-black text-blue-500 dark:text-blue-400 uppercase tracking-widest truncate">
                  {group.domain}
                </p>
                {/* Nom du sous-domaine */}
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                  {group.subdomain}
                </p>
              </div>

              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                {group.courses.length} cours
              </span>
            </button>

            {/* Liste des cours dans le groupe */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {group.courses.map(course => {
                const key = courseKey(group.subdomain, course);
                const exists = alreadyExists(course.name);
                const isSelected = selected.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={exists}
                    onClick={() => toggleCourse(key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${
                      exists
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
                        : isSelected
                          ? 'bg-blue-50 dark:bg-blue-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    {/* Checkbox individuelle */}
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      exists
                        ? 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                        : isSelected
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {(isSelected || exists) && <Check size={10} className={exists ? 'text-slate-400' : 'text-white'} />}
                    </div>

                    {/* Nom du cours */}
                    <span className={`text-sm font-medium flex-1 text-left ${
                      exists ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {course.name}
                    </span>

                    {/* Code */}
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {course.code}
                    </span>

                    {/* Pondération résumée */}
                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 shrink-0">
                      P:{course.max_period} E:{course.max_exam}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ==================================================================
  // RENDU : Humanités (par catégorie)
  // ==================================================================
  const renderHumanitiesCatalog = () => (
    <div className="space-y-4">
      {HUMANITIES_COURSE_CATALOG.map((cat) => {
        const availableCourses = cat.courses.filter(c => !alreadyExists(c.name));
        const catKeys = availableCourses.map(c => courseKey(cat.category, c));
        const allCatSelected = catKeys.length > 0 && catKeys.every(k => selected.has(k));
        const someCatSelected = catKeys.some(k => selected.has(k));

        return (
          <div key={cat.category} className="border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
            {/* En-tête catégorie */}
            <button
              type="button"
              onClick={() => toggleGroup(cat.category, cat.courses)}
              className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all shrink-0 ${
                allCatSelected
                  ? 'bg-purple-600 border-purple-600'
                  : someCatSelected
                    ? 'bg-purple-200 border-purple-400'
                    : 'border-slate-300 dark:border-slate-600'
              }`}>
                {(allCatSelected || someCatSelected) && <Check size={12} className="text-white" />}
              </div>
              <div className="text-left flex-1">
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{cat.category}</p>
              </div>
              <span className="text-[10px] font-bold text-slate-400 shrink-0">
                {cat.courses.length} cours
              </span>
            </button>

            {/* Liste des cours */}
            <div className="divide-y divide-slate-100 dark:divide-white/5">
              {cat.courses.map(course => {
                const key = courseKey(cat.category, course);
                const exists = alreadyExists(course.name);
                const isSelected = selected.has(key);

                return (
                  <button
                    key={key}
                    type="button"
                    disabled={exists}
                    onClick={() => toggleCourse(key)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-all ${
                      exists
                        ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
                        : isSelected
                          ? 'bg-purple-50 dark:bg-purple-900/20'
                          : 'hover:bg-slate-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
                      exists
                        ? 'border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800'
                        : isSelected
                          ? 'bg-purple-600 border-purple-600'
                          : 'border-slate-300 dark:border-slate-600'
                    }`}>
                      {(isSelected || exists) && <Check size={10} className={exists ? 'text-slate-400' : 'text-white'} />}
                    </div>
                    <span className={`text-sm font-medium flex-1 text-left ${
                      exists ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
                    }`}>
                      {course.name}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                      {course.code}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 shrink-0">
                      P:{course.max_period} E:{course.max_exam}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );

  // ==================================================================
  // RENDU PRINCIPAL
  // ==================================================================
  const accentColor = isPrimary ? 'blue' : 'purple';

  return (
    <div className="space-y-4 h-full flex flex-col">
      {/* Barre d'info */}
      <div className={`bg-${accentColor}-50 dark:bg-${accentColor}-900/20 p-4 rounded-2xl flex items-start gap-3 shrink-0`}>
        <Sparkles className={`text-${accentColor}-600 shrink-0 mt-0.5`} size={18} />
        <div>
          <p className={`text-[11px] font-bold text-${accentColor}-900 dark:text-${accentColor}-200`}>
            {isPrimary ? 'Catalogue Éducation de Base' : 'Catalogue Humanités'}
          </p>
          <p className={`text-[10px] text-${accentColor}-700 dark:text-${accentColor}-300/80 leading-relaxed mt-1`}>
            {isPrimary
              ? 'Sélectionnez les cours à ajouter. Les pondérations sont pré-remplies selon le programme officiel.'
              : 'Sélectionnez les cours communs à ajouter. Les pondérations sont modifiables après ajout.'
            }
          </p>
        </div>
      </div>

      {/* Actions de sélection rapide */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleSelectAll}
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
          >
            Tout sélectionner
          </button>
          <span className="text-slate-300">|</span>
          <button
            type="button"
            onClick={handleDeselectAll}
            className="text-[10px] font-bold text-slate-400 hover:underline"
          >
            Tout désélectionner
          </button>
        </div>
        {selected.size > 0 && (
          <span className={`text-[10px] font-black text-${accentColor}-600 bg-${accentColor}-50 dark:bg-${accentColor}-900/30 px-2 py-1 rounded-lg`}>
            {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
          </span>
        )}
      </div>

      {/* Catalogue scrollable */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1">
        {isPrimary ? renderEBCatalog() : renderHumanitiesCatalog()}
      </div>

      {/* Bouton d'ajout en masse (fixé en bas) */}
      {selected.size > 0 && (
        <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={isAdding}
            className={`w-full flex items-center justify-center gap-3 py-4 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 ${
              isPrimary
                ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/25'
                : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/25'
            }`}
          >
            {isAdding ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Ajout en cours...
              </>
            ) : (
              <>
                <Plus size={20} />
                Ajouter {selected.size} cours à la classe
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
