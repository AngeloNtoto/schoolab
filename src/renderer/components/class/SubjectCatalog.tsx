/**
 * SubjectCatalog.tsx
 * 
 * Composant catalogue de cours pré-définis avec :
 * - Groupes pliables/dépliables (accordéon) pour économiser l'espace
 * - Édition inline de la pondération (max_period), examen = 2 × période
 * - Sélection par checkbox avec ajout en masse
 * 
 * Pour l'EB (7ème/8ème) : cours par domaine/sous-domaine
 * Pour les Humanités (1ère-4ème) : cours par catégorie
 */

import React, { useState, useMemo } from 'react';
import { Check, Plus, ChevronRight, Info } from '../iconsSvg';
import {
  EB_COURSE_CATALOG,
  HUMANITIES_COURSE_CATALOG,
  CatalogCourse,
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

  // État : cours cochés par l'utilisateur
  const [selected, setSelected] = useState<Set<CourseKey>>(new Set());
  // État : groupes ouverts/fermés (accordéon), tous fermés par défaut
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  // État : pondérations modifiées par l'utilisateur (clé → max_period)
  const [overrides, setOverrides] = useState<Map<CourseKey, number>>(new Map());
  const [isAdding, setIsAdding] = useState(false);

  // Noms existants en minuscule pour comparaison insensible à la casse
  const existingNamesLower = useMemo(
    () => new Set(existingSubjectNames.map(n => n.toLowerCase())),
    [existingSubjectNames]
  );

  const alreadyExists = (name: string) => existingNamesLower.has(name.toLowerCase());

  // Toggle ouverture/fermeture d'un groupe
  const toggleExpand = (groupLabel: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupLabel)) next.delete(groupLabel);
      else next.add(groupLabel);
      return next;
    });
  };

  // Toggle la sélection d'un cours
  const toggleCourse = (key: CourseKey) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Sélectionner/désélectionner tout un groupe
  const toggleGroup = (groupLabel: string, courses: CatalogCourse[], e: React.MouseEvent) => {
    e.stopPropagation(); // Empêche le toggle de l'accordéon
    const keys = courses.filter(c => !alreadyExists(c.name)).map(c => courseKey(groupLabel, c));
    const allSelected = keys.every(k => selected.has(k));

    setSelected(prev => {
      const next = new Set(prev);
      if (allSelected) {
        keys.forEach(k => next.delete(k));
      } else {
        keys.forEach(k => next.add(k));
      }
      return next;
    });

    // Ouvrir le groupe automatiquement quand on sélectionne
    if (!allSelected && !expandedGroups.has(groupLabel)) {
      setExpandedGroups(prev => new Set([...prev, groupLabel]));
    }
  };

  // Modifier la pondération d'un cours
  const setOverride = (key: CourseKey, value: number) => {
    setOverrides(prev => {
      const next = new Map(prev);
      next.set(key, value);
      return next;
    });
  };

  // La pondération effective d'un cours (override ou valeur catalogue)
  const getEffectivePeriod = (key: CourseKey, defaultValue: number): number => {
    return overrides.get(key) ?? defaultValue;
  };

  // Retrouve le cours à partir de sa clé
  const findCourse = (key: CourseKey): { course: CatalogCourse; domain?: string; subdomain?: string } | null => {
    for (const group of EB_COURSE_CATALOG) {
      for (const course of group.courses) {
        // La clé utilise le nom du domaine (pas le sous-domaine) pour être cohérent avec le catalogue
        if (courseKey(group.domain, course) === key) {
          return { course, domain: group.domain, subdomain: group.subdomain };
        }
      }
    }
    for (const cat of HUMANITIES_COURSE_CATALOG) {
      for (const course of cat.courses) {
        if (courseKey(cat.category, course) === key) {
          return { course };
        }
      }
    }
    return null;
  };

  // Ajouter tous les cours sélectionnés
  const handleAddSelected = async () => {
    if (selected.size === 0) return;
    setIsAdding(true);

    try {
      let addedCount = 0;

      for (const key of selected) {
        const found = findCourse(key);
        if (!found) continue;
        const { course, domain, subdomain } = found;
        if (alreadyExists(course.name)) continue;

        // Pondération effective (override ou catalogue)
        const maxPeriod = getEffectivePeriod(key, course.max_period);
        const maxExam = maxPeriod * 2; // Examen = 2× période

        // Résoudre le domain_id pour l'EB
        let domainId: number | null = null;
        if (isPrimary && domain) {
          try {
            const domResult = await dbService.query<{ id: number }>(
              'SELECT id FROM domains WHERE name = ?', [domain]
            );
            if (domResult.length > 0) {
              domainId = domResult[0].id;
            } else {
              domainId = await domainService.createDomain(domain);
            }
          } catch {
            console.warn(`Domaine "${domain}" non résolu`);
          }
        }

        await dbService.execute(
          `INSERT INTO subjects (name, code, sub_domain, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id, is_dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [course.name, course.code, subdomain || '', maxPeriod, maxPeriod, maxExam, maxPeriod, maxPeriod, maxExam, classId, domainId]
        );
        addedCount++;
      }

      setSelected(new Set());
      setOverrides(new Map());
      toast.success(`${addedCount} cours ajouté${addedCount > 1 ? 's' : ''} avec succès`);
      onSuccess();
    } catch (error) {
      console.error('Erreur ajout catalogue:', error);
      toast.error("Erreur lors de l'ajout des cours");
    } finally {
      setIsAdding(false);
    }
  };

  // Tout sélectionner
  const handleSelectAll = () => {
    const allKeys = new Set<CourseKey>();
    if (isPrimary) {
      EB_COURSE_CATALOG.forEach(group => {
        group.courses.forEach(c => {
          // Utilise group.domain comme clé (cohérent avec le catalogue restructuré)
          if (!alreadyExists(c.name)) allKeys.add(courseKey(group.domain, c));
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
    // Ouvrir tous les groupes pour montrer la sélection
    const allGroupLabels = isPrimary
      ? [...new Set(EB_COURSE_CATALOG.map(g => g.domain))]
      : HUMANITIES_COURSE_CATALOG.map(c => c.category);
    setExpandedGroups(new Set(allGroupLabels));
  };

  const handleDeselectAll = () => setSelected(new Set());

  // ================================================================
  // Rendu d'un cours individuel (ligne dans le catalogue)
  // ================================================================
  const renderCourseRow = (course: CatalogCourse, groupLabel: string, accentCls: string) => {
    const key = courseKey(groupLabel, course);
    const exists = alreadyExists(course.name);
    const isSelected = selected.has(key);
    const effectivePeriod = getEffectivePeriod(key, course.max_period);
    const effectiveExam = effectivePeriod * 2;

    return (
      <div
        key={key}
        onClick={() => !exists && toggleCourse(key)}
        className={`flex items-center gap-2 px-4 py-2 transition-all cursor-pointer border-t border-slate-100 dark:border-white/5 first:border-t-0 ${
          exists
            ? 'opacity-40 cursor-not-allowed bg-slate-50 dark:bg-slate-900/30'
            : isSelected
              ? `bg-${accentCls}-50 dark:bg-${accentCls}-900/20`
              : 'hover:bg-slate-50 dark:hover:bg-white/5'
        }`}
      >
        {/* Checkbox */}
        <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 ${
          exists ? 'border-slate-200 bg-slate-100 dark:border-slate-700' :
          isSelected ? `bg-${accentCls}-600 border-${accentCls}-600` : 'border-slate-300 dark:border-slate-600'
        }`}>
          {(isSelected || exists) && <Check size={10} className={exists ? 'text-slate-400' : 'text-white'} />}
        </div>

        {/* Nom du cours */}
        <span className={`text-sm font-medium flex-1 min-w-0 truncate ${
          exists ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'
        }`}>
          {course.name}
        </span>

        {/* Code */}
        <span className="text-[8px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0">
          {course.code}
        </span>

        {/* Pondération inline : champ éditable pour la période, examen auto */}
        <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
          <span className="text-[8px] font-bold text-slate-400">P:</span>
          <input
            type="number"
            min={1}
            value={effectivePeriod}
            disabled={exists}
            onChange={e => setOverride(key, Math.max(1, Number(e.target.value)))}
            className={`w-10 text-center text-[10px] font-bold rounded border outline-none transition-all py-0.5 ${
              isSelected
                ? `border-${accentCls}-300 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:ring-1 focus:ring-${accentCls}-400`
                : 'border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-400'
            }`}
          />
          <span className="text-[8px] font-bold text-slate-300">→</span>
          <span className="text-[8px] font-bold text-slate-400">E:{effectiveExam}</span>
        </div>
      </div>
    );
  };

  // ================================================================
  // Rendu d'un groupe (EB par domaine/sous-domaine, Humanités par catégorie)
  // ================================================================
  const renderGroup = (
    groupLabel: string,
    domainLabel: string | null, // null pour les humanités
    courses: CatalogCourse[],
    accentCls: string
  ) => {
    const isExpanded = expandedGroups.has(groupLabel);
    const availableCourses = courses.filter(c => !alreadyExists(c.name));
    const groupKeys = availableCourses.map(c => courseKey(groupLabel, c));
    const allGroupSelected = groupKeys.length > 0 && groupKeys.every(k => selected.has(k));
    const someGroupSelected = groupKeys.some(k => selected.has(k));
    const selectedCount = groupKeys.filter(k => selected.has(k)).length;

    return (
      <div key={groupLabel} className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
        {/* En-tête cliquable : toggle accordéon */}
        <button
          type="button"
          onClick={() => toggleExpand(groupLabel)}
          className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          {/* Chevron animé */}
          <div className={`transition-transform duration-200 text-slate-400 ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight size={14} />
          </div>

          {/* Checkbox du groupe (cliquable séparément) */}
          <div
            onClick={(e) => toggleGroup(groupLabel, courses, e)}
            className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
              allGroupSelected ? `bg-${accentCls}-600 border-${accentCls}-600` :
              someGroupSelected ? `bg-${accentCls}-200 border-${accentCls}-400` :
              'border-slate-300 dark:border-slate-600'
            }`}
          >
            {(allGroupSelected || someGroupSelected) && <Check size={10} className="text-white" />}
          </div>

          {/* Labels */}
          <div className="text-left flex-1 min-w-0">
            {domainLabel && (
              <p className={`text-[7px] font-black text-${accentCls}-500 uppercase tracking-widest truncate`}>
                {domainLabel}
              </p>
            )}
            <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
              {groupLabel}
            </p>
          </div>

          {/* Badge compteur */}
          <div className="flex items-center gap-1.5 shrink-0">
            {selectedCount > 0 && (
              <span className={`text-[9px] font-black text-${accentCls}-600 bg-${accentCls}-100 dark:bg-${accentCls}-900/40 px-1.5 py-0.5 rounded-full`}>
                {selectedCount}
              </span>
            )}
            <span className="text-[9px] font-bold text-slate-400">
              {courses.length}
            </span>
          </div>
        </button>

        {/* Contenu dépliable */}
        {isExpanded && (
          <div className="animate-in slide-in-from-top-1 duration-200">
            {courses.map(course => renderCourseRow(course, groupLabel, accentCls))}
          </div>
        )}
      </div>
    );
  };

  // ================================================================
  // RENDU PRINCIPAL
  // ================================================================
  const accentCls = isPrimary ? 'blue' : 'purple';

  return (
    <div className="space-y-3 h-full flex flex-col">
      {/* Actions rapides + info tooltip */}
      <div className="flex items-center justify-between shrink-0">
        <div className="flex gap-2 items-center">
          <button type="button" onClick={handleSelectAll}
            className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline">
            Tout sélectionner
          </button>
          <span className="text-slate-300">|</span>
          <button type="button" onClick={handleDeselectAll}
            className="text-[10px] font-bold text-slate-400 hover:underline">
            Tout désélectionner
          </button>
        </div>
        <div className="flex items-center gap-2">
          {selected.size > 0 && (
            <span className={`text-[10px] font-black text-${accentCls}-600 bg-${accentCls}-50 dark:bg-${accentCls}-900/30 px-2 py-0.5 rounded-lg`}>
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
          )}
          {/* Petit icône info avec tooltip */}
          <div className="relative group">
            <div className={`w-5 h-5 rounded-full bg-${accentCls}-100 dark:bg-${accentCls}-900/30 flex items-center justify-center cursor-help`}>
              <Info size={12} className={`text-${accentCls}-500`} />
            </div>
            <div className="absolute right-0 top-7 z-50 hidden group-hover:block w-56 p-2.5 bg-slate-800 dark:bg-slate-700 text-white text-[10px] font-medium rounded-xl shadow-xl leading-relaxed">
              Cochez les cours à ajouter. Modifiez les pondérations si besoin (examen = 2× période).
              <div className="absolute -top-1 right-2 w-2 h-2 bg-slate-800 dark:bg-slate-700 rotate-45" />
            </div>
          </div>
        </div>
      </div>

      {/* Catalogue scrollable (accordéon) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-2">
        {isPrimary
          ? (() => {
              // Regrouper le catalogue EB par domaine, les sous-domaines à l'intérieur
              const domainGroups = new Map<string, { subdomain: string; courses: CatalogCourse[] }[]>();
              EB_COURSE_CATALOG.forEach(group => {
                if (!domainGroups.has(group.domain)) {
                  domainGroups.set(group.domain, []);
                }
                domainGroups.get(group.domain)!.push({ subdomain: group.subdomain, courses: group.courses });
              });

              return Array.from(domainGroups.entries()).map(([domainName, subdomains]) => {
                // Tous les cours de ce domaine (pour la checkbox et le compteur)
                const allCourses = subdomains.flatMap(sd => sd.courses);
                const isDomainExpanded = expandedGroups.has(domainName);
                const allKeys = allCourses.filter(c => !alreadyExists(c.name)).map(c => courseKey(domainName, c));
                const allDomainSelected = allKeys.length > 0 && allKeys.every(k => selected.has(k));
                const someDomainSelected = allKeys.some(k => selected.has(k));
                const domainSelectedCount = allKeys.filter(k => selected.has(k)).length;

                return (
                  <div key={domainName} className="border border-slate-200 dark:border-white/10 rounded-xl overflow-hidden">
                    {/* En-tête du domaine */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(domainName)}
                      className="w-full flex items-center gap-2 px-3 py-2.5 bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                      <div className={`transition-transform duration-200 text-slate-400 ${isDomainExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight size={14} />
                      </div>
                      <div
                        onClick={(e) => {
                          e.stopPropagation();
                          // Toggle tous les cours du domaine
                          const keys = allCourses.filter(c => !alreadyExists(c.name)).map(c => courseKey(domainName, c));
                          const allSel = keys.every(k => selected.has(k));
                          setSelected(prev => {
                            const next = new Set(prev);
                            if (allSel) { keys.forEach(k => next.delete(k)); }
                            else { keys.forEach(k => next.add(k)); }
                            return next;
                          });
                          if (!allSel && !isDomainExpanded) toggleExpand(domainName);
                        }}
                        className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all shrink-0 cursor-pointer ${
                          allDomainSelected ? `bg-blue-600 border-blue-600` :
                          someDomainSelected ? `bg-blue-200 border-blue-400` :
                          'border-slate-300 dark:border-slate-600'
                        }`}
                      >
                        {(allDomainSelected || someDomainSelected) && <Check size={10} className="text-white" />}
                      </div>
                      <div className="text-left flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate uppercase">
                          {domainName}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        {domainSelectedCount > 0 && (
                          <span className="text-[9px] font-black text-blue-600 bg-blue-100 dark:bg-blue-900/40 px-1.5 py-0.5 rounded-full">
                            {domainSelectedCount}
                          </span>
                        )}
                        <span className="text-[9px] font-bold text-slate-400">{allCourses.length}</span>
                      </div>
                    </button>

                    {/* Contenu déplié : sous-domaines avec leurs cours */}
                    {isDomainExpanded && (
                      <div className="animate-in slide-in-from-top-1 duration-200">
                        {subdomains.map(sd => {
                          const sdKeys = sd.courses.filter(c => !alreadyExists(c.name)).map(c => courseKey(domainName, c));
                          const sdSelectedCount = sdKeys.filter(k => selected.has(k)).length;
                          return (
                            <div key={sd.subdomain || 'no-sd'}>
                              {/* Sous-header seulement si le sous-domaine existe */}
                              {sd.subdomain && (
                                <div className="flex items-center gap-2 px-4 py-1.5 bg-slate-100/60 dark:bg-slate-800/30 border-t border-slate-100 dark:border-white/5">
                                  <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest truncate">
                                    ↳ {sd.subdomain}
                                  </span>
                                  {sdSelectedCount > 0 && (
                                    <span className="text-[8px] font-bold text-blue-500 bg-blue-50 dark:bg-blue-900/30 px-1 py-0.5 rounded">
                                      {sdSelectedCount}
                                    </span>
                                  )}
                                </div>
                              )}
                              {/* Cours du sous-domaine */}
                              {sd.courses.map(course => renderCourseRow(course, domainName, accentCls))}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()
          : HUMANITIES_COURSE_CATALOG.map(cat =>
              renderGroup(cat.category, null, cat.courses, accentCls)
            )
        }
      </div>

      {/* Bouton flottant d'ajout en masse */}
      {selected.size > 0 && (
        <div className="shrink-0 pt-2 border-t border-slate-100 dark:border-white/5">
          <button
            type="button"
            onClick={handleAddSelected}
            disabled={isAdding}
            className={`w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl font-black uppercase tracking-widest text-[11px] text-white shadow-xl transition-all active:scale-[0.98] disabled:opacity-60 ${
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
                <Plus size={18} />
                Ajouter {selected.size} cours
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
