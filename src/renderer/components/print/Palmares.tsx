import React, { useState, useRef, useMemo } from 'react';
import { ArrowLeft, Printer } from '../iconsSvg';
import PrintButton from './PrintWrapper';

import { repechageService, Repechage } from '../../services/repechageService';
import { deliberationConfigService, DeliberationConfig, DEFAULT_DELIBERATION_CONFIG } from '../../services/deliberationConfigService';

import { ClassInfo, Student, Subject, Grade, Period, PalmaresMode, RankedStudent } from '../../types/palmares';
import { periode, calculateRankings } from '../../utils/palmaresLogic';
import { RepechageListTable } from './palmares/RepechageListTable';
import { AnnualTable } from './palmares/AnnualTable';
import { PeriodTable } from './palmares/PeriodTable';

interface PalmaresProps {
  classInfo: ClassInfo;
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  schoolName: string;
  schoolCity: string;
  schoolPoBox: string;
  onClose: () => void;
}

export default function Palmares({
  classInfo,
  students,
  subjects,
  grades,
  schoolName,
  schoolCity,
  schoolPoBox,
  onClose
}: PalmaresProps) {
  if (!classInfo) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 bg-slate-50 dark:bg-slate-900">
        <p>Les données de la classe sont introuvables. Veuillez fermer cet onglet et le rouvrir depuis la classe.</p>
      </div>
    );
  }

  const palmaresRef = useRef<HTMLDivElement>(null);

  const [selectedPeriod, setSelectedPeriod] = useState<Period>('SEM1');
  const [onlyAbandons, setOnlyAbandons] = useState(false);
  const [sortByAbandon] = useState(false);
  const [palmaresMode, setPalmaresMode] = useState<PalmaresMode>('BEFORE_DELIBERATION');
  const [repechages, setRepechages] = useState<Repechage[]>([]);
  const [delibConfig, setDelibConfig] = useState<DeliberationConfig>(DEFAULT_DELIBERATION_CONFIG);
  // Contrôle si le statut "Voir Bureau" est affiché dans la liste de repêchage.
  // Mettre à false pour imprimer la liste sans tenir compte du VB.
  const [showVoirBureau, setShowVoirBureau] = useState(true);

  // Chargement des points de repêchage et de la config
  React.useEffect(() => {
    repechageService.getRepechagesByClass(classInfo.id).then(setRepechages).catch(console.error);
    deliberationConfigService.load().then(setDelibConfig).catch(console.error);
  }, [classInfo.id]);

  // Réinitialiser le mode de délibération si la période n'est pas annuelle
  React.useEffect(() => {
    if (selectedPeriod !== 'ANNUAL') {
      setPalmaresMode('BEFORE_DELIBERATION');
    }
  }, [selectedPeriod]);

  // CSS d'impression propre pour A4 portrait
  const printCss = `
    @page { 
      size: A4 portrait; 
      margin: 5mm; 
    }
    * {
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body { 
      background: white; 
      margin: 0; 
      font-family: 'Inter', system-ui, sans-serif;
      color: #000000 !important;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th, td {
      border: 1px solid #000000 !important;
      padding: 3px 5px !important;
      font-size: 11px !important;
      line-height: 1.15 !important;
      color: #000000 !important;
    }
  `;

  // Calcul, classement et distribution des élèves au sein des 4 catégories
  const rankedStudents: RankedStudent[] = useMemo(() => {
    return calculateRankings(
      students,
      subjects,
      grades,
      selectedPeriod,
      onlyAbandons,
      sortByAbandon,
      repechages,
      palmaresMode,
      delibConfig
    );
  }, [students, subjects, grades, selectedPeriod, onlyAbandons, sortByAbandon, repechages, palmaresMode, delibConfig]);

  // Calcul des statistiques d'en-tête conformes au modèle textuel
  const stats = {
    total: students.length,
    cat1: rankedStudents.filter(r => r.category === 1).length,
    cat2: rankedStudents.filter(r => r.category === 2).length,
    cat3: rankedStudents.filter(r => r.category === 3).length,
    cat4: rankedStudents.filter(r => r.category === 4).length,
    cat5: rankedStudents.filter(r => r.category === 5).length,
    passed: rankedStudents.filter(r => r.category === 1 || r.category === 2).length,
    failed: rankedStudents.filter(r => r.category === 3).length,
    participants: students.length - rankedStudents.filter(r => r.category === 4 || r.category === 5).length,
  };

  // Libellés dynamiques selon la période
  const categoryLabels: Record<number, string> =
    selectedPeriod === 'ANNUAL' && palmaresMode !== 'BEFORE_DELIBERATION'
      ? {
          1: delibConfig.categorie_1_label,
          2: delibConfig.categorie_2_label,
          3: delibConfig.categorie_3_label,
          4: delibConfig.categorie_4_label,
          5: delibConfig.categorie_5_label,
        }
      : {
          1: delibConfig.categorie_1_label_avant,
          2: delibConfig.categorie_2_label_avant,
          3: delibConfig.categorie_3_label_avant,
          4: delibConfig.categorie_4_label_avant,
          5: delibConfig.categorie_5_label_avant,
        };

  // Filtrage des étudiants à afficher selon le mode
  let displayedStudents: RankedStudent[] = palmaresMode === 'REPECHAGE_LIST'
    ? rankedStudents.filter((r: RankedStudent) => r.category === 2 || r.category === 5)
    : rankedStudents;

  if (palmaresMode === 'REPECHAGE_LIST') {
    displayedStudents = [...displayedStudents].sort((a: RankedStudent, b: RankedStudent) => {
      const nameA = `${a.student.last_name} ${a.student.post_name || ''} ${a.student.first_name || ''}`;
      const nameB = `${b.student.last_name} ${b.student.post_name || ''} ${b.student.first_name || ''}`;
      return nameA.localeCompare(nameB, 'fr', { sensitivity: 'base' });
    });
  }

  const documentTitle = palmaresMode === 'REPECHAGE_LIST' ? 'LISTE DE REPECHAGE' : 'PALMARÈS';

  return (
    <div className="bg-slate-100 p-8 print:p-0 print:bg-white">
      {/* Barre d'outils supérieure — deux rangées pour une disposition propre (masquée à l'impression) */}
      <div className="max-w-[210mm] mx-auto mb-6 bg-white border border-slate-200 shadow-sm rounded-xl px-4 py-3 print:hidden">

        {/* Rangée 1 : Navigation + Sélecteurs principaux */}
        <div className="flex items-center gap-3 flex-wrap">

          {/* Bouton Retour */}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 bg-slate-50 hover:bg-slate-100 px-3 py-2 rounded-lg border border-slate-200 active:scale-[0.97] transition-all duration-150 font-medium text-sm cursor-pointer"
          >
            <ArrowLeft size={16} />
            Retour
          </button>

          {/* Séparateur vertical */}
          <div className="h-7 w-px bg-slate-200"></div>

          {/* Sélection de la Période */}
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as Period)}
            className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none bg-white font-medium text-slate-700 text-sm cursor-pointer"
          >
            <option value="P1">1ère Période</option>
            <option value="P2">2ème Période</option>
            <option value="EXAM1">Examen 1er Sem.</option>
            <option value="SEM1">Semestre 1</option>
            <option value="P3">3ème Période</option>
            <option value="P4">4ème Période</option>
            <option value="EXAM2">Examen 2ème Sem.</option>
            <option value="SEM2">Semestre 2</option>
            <option value="ANNUAL">Annuel</option>
          </select>

          {/* Sélection du mode de Délibération (uniquement si période Annuel) */}
          {selectedPeriod === 'ANNUAL' && (
            <select
              value={palmaresMode}
              onChange={(e) => setPalmaresMode(e.target.value as PalmaresMode)}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-400/30 focus:border-blue-400 outline-none bg-white font-medium text-slate-700 text-sm cursor-pointer"
            >
              <option value="BEFORE_DELIBERATION">Avant Délibération</option>
              <option value="AFTER_DELIBERATION">Palmarès Final (De Délib.)</option>
              <option value="REPECHAGE_LIST">Liste de Repêchage</option>
            </select>
          )}

          {/* Pousser le bouton imprimer à droite */}
          <div className="flex-1"></div>

          {/* Bouton d'impression */}
          <PrintButton
            targetRef={palmaresRef}
            title={`${documentTitle} de la ${classInfo.name} - ${periode(selectedPeriod)}`}
            extraCss={printCss}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 active:scale-[0.97] transition-all duration-150 shadow-sm font-medium text-sm cursor-pointer"
          >
            <Printer size={16} />
            Imprimer
          </PrintButton>
        </div>

        {/* Rangée 2 : Options et filtres secondaires (séparée par un trait fin) */}
        <div className="flex items-center gap-4 mt-2.5 pt-2.5 border-t border-slate-100">

          {/* Filtre d'exclusion des Abandons */}
          <label className="flex items-center gap-2 text-sm font-medium text-slate-600 cursor-pointer select-none hover:text-slate-800 transition-colors">
            <input
              type="checkbox"
              checked={onlyAbandons}
              onChange={(e) => setOnlyAbandons(e.target.checked)}
              className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
            />
            Sans abandons
          </label>

          {/* Toggle VB : visible uniquement en mode Liste de Repêchage */}
          {palmaresMode === 'REPECHAGE_LIST' && (
            <>
              <div className="h-5 w-px bg-slate-200"></div>
              <label
                className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none transition-colors"
                title={showVoirBureau ? 'Masquer VB : affiche les vraies matières échouées' : 'Afficher VB : remplace les matières par « Voir Bureau »'}
              >
                <input
                  type="checkbox"
                  checked={showVoirBureau}
                  onChange={(e) => setShowVoirBureau(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-amber-300 text-amber-500 focus:ring-amber-400 cursor-pointer"
                />
                <span className={showVoirBureau ? 'text-amber-600 font-semibold' : 'text-slate-400'}>
                  Afficher VB
                </span>
              </label>
            </>
          )}

          {/* Résumé des stats dans la deuxième rangée */}
          <div className="flex-1"></div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-medium">
            <span>{stats.total} élèves</span>
            <span>·</span>
            <span className="text-green-600">{stats.passed} réussis</span>
            <span>·</span>
            <span className="text-red-500">{stats.failed} échoués</span>
          </div>
        </div>
      </div>

      {/* Rendu imprimable du palmarès */}
      <div
        ref={palmaresRef}
        className="print-container max-w-[210mm] mx-auto bg-white shadow-xl p-6 print:p-2 min-h-[297mm] text-black"
      >
        {/* En-tête supérieure avec les informations de l'école et des statistiques (Classe et Effectif retirés) */}
        <div className="flex justify-between items-start mb-4 font-bold text-[14px] text-black border-b border-black/80 pb-2">
          <div className="space-y-0.5">
            <p className="uppercase">{schoolName}</p>
            {schoolPoBox && <p className="uppercase">B.P : {schoolPoBox}</p>}
            <p className="uppercase">{schoolCity}</p>
          </div>

          <div className="space-y-0.5 text-right uppercase">
            <p>Ont réussis: {stats.passed}</p>
            <p>Ont échoué: {stats.failed}</p>
            <p>Non classés: {stats.cat5}</p>
          </div>
        </div>

        {/* Titre principal centré à l'extérieur pour un rendu très professionnel */}
        <div className="text-center font-black text-[16px] uppercase tracking-wider mb-5 text-black">
          <span className="border-b-2 border-black pb-0.5 px-4 inline-block">
            {documentTitle} de la {classInfo.name.toUpperCase()} - {periode(selectedPeriod)}
          </span>
        </div>

        {/* Rendu conditionnel du tableau selon le mode */}
        {palmaresMode === 'REPECHAGE_LIST' ? (
          <RepechageListTable
            displayedStudents={displayedStudents}
            showVoirBureau={showVoirBureau}
          />
        ) : selectedPeriod === 'ANNUAL' ? (
          <AnnualTable
            displayedStudents={displayedStudents}
            stats={stats}
            categoryLabels={categoryLabels}
            selectedPeriod={selectedPeriod}
            palmaresMode={palmaresMode}
          />
        ) : (
          <PeriodTable
            displayedStudents={displayedStudents}
            stats={stats}
            categoryLabels={categoryLabels}
            selectedPeriod={selectedPeriod}
          />
        )}

        {/* Bas de page pour les signatures officielles */}
        <div className="mt-8 flex justify-between text-[12px] text-black font-bold break-inside-avoid">
          <div className="text-center">
            <p className="font-bold mb-8">Le Chef d'Établissement</p>
            <p className="border-t border-black pt-1 px-4">Nom et Signature</p>
          </div>
          <div className="text-right">
            <p className="font-bold">Fait à {schoolCity}</p>
            <p>Le ____/____/______</p>
          </div>
        </div>
      </div>
    </div>
  );
}
