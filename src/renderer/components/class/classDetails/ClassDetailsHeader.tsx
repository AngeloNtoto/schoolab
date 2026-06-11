import React from 'react';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Award,
  Users,
  FileText,
  BookOpen,
  Printer,
  Search,
  ArrowUpDown,
  Edit,
  ChevronDown,
  Lock,
  Unlock,
  Maximize,
  Minimize,
  Download,
  RefreshCw,
  RotateCcw
} from '../../iconsSvg';
import { ClassData, Subject } from '../../../services/classService';
import { Student } from '../../../services/studentService';
import { CustomSort } from '../../../services/customSortService';
import { ALL_PERIODS } from './gradeUtils';

interface ClassDetailsHeaderProps {
  classInfo: ClassData;
  students: Student[];
  subjects: Subject[];
  refreshing: boolean;
  searchQuery: string;
  sortOrder: string;
  customSorts: CustomSort[];
  selectedPeriods: Set<string>;
  lockedPeriods: Set<string>;
  focusedSubject: number | 'all';
  showFiltersPopover: boolean;
  showOnlyAbandons: boolean;
  showStats: boolean;
  isFullscreen: boolean;
  correctionMax: number | null;
  correctionMaxInput: string;
  progressData: Record<string, { filled: number; total: number }>;
  popoverRef: React.RefObject<HTMLDivElement | null>;
  setSearchQuery: (value: string) => void;
  setSortOrder: React.Dispatch<React.SetStateAction<string>>;
  setSelectedPeriods: React.Dispatch<React.SetStateAction<Set<string>>>;
  setFocusedSubject: React.Dispatch<React.SetStateAction<number | 'all'>>;
  setShowFiltersPopover: React.Dispatch<React.SetStateAction<boolean>>;
  setShowOnlyAbandons: React.Dispatch<React.SetStateAction<boolean>>;
  setShowStats: React.Dispatch<React.SetStateAction<boolean>>;
  setCorrectionMaxInput: React.Dispatch<React.SetStateAction<string>>;
  toggleLockPeriod: (period: string) => void;
  onBack: () => void;
  onRefresh: () => Promise<void>;
  onOpenPalmares: () => void;
  onOpenCouponsPrint: () => void;
  onOpenBulkPrint: () => void;
  onExportCSV: () => void;
  onToggleFullscreen: () => void;
  onShowAddSubject: () => void;
  onShowAddStudent: () => void;
  onCreateCustomSort: () => void;
  onEditCustomSort: (sort: CustomSort) => void;
  onDeleteCustomSort: (sortId: number) => Promise<void>;
}

export default function ClassDetailsHeader({
  classInfo,
  students,
  subjects,
  refreshing,
  searchQuery,
  sortOrder,
  customSorts,
  selectedPeriods,
  lockedPeriods,
  focusedSubject,
  showFiltersPopover,
  showOnlyAbandons,
  showStats,
  isFullscreen,
  correctionMax,
  correctionMaxInput,
  progressData,
  popoverRef,
  setSearchQuery,
  setSortOrder,
  setSelectedPeriods,
  setFocusedSubject,
  setShowFiltersPopover,
  setShowOnlyAbandons,
  setShowStats,
  setCorrectionMaxInput,
  toggleLockPeriod,
  onBack,
  onRefresh,
  onOpenPalmares,
  onOpenCouponsPrint,
  onOpenBulkPrint,
  onExportCSV,
  onToggleFullscreen,
  onShowAddSubject,
  onShowAddStudent,
  onCreateCustomSort,
  onEditCustomSort,
  onDeleteCustomSort
}: ClassDetailsHeaderProps) {
  return (
    <header className="bg-blue-600 dark:bg-slate-900 border-b border-white/5 sticky top-0 z-30 shadow-lg">
      <div className="px-6 py-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={onBack}
              className="p-2.5 bg-white/10 hover:bg-white hover:text-blue-600 dark:hover:text-slate-900 rounded-xl text-white transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/5 hover:scale-105 active:scale-95 group shrink-0"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform duration-300" />
            </button>

            <div className="flex flex-col min-w-0">
              <h1 className="text-xl font-black text-white dark:text-slate-100 flex items-center gap-2 tracking-tight truncate leading-none">
                {`${classInfo.level} ${classInfo.option}`}
                <span className="text-blue-300/50 dark:text-slate-500 font-light ml-1">|</span>
                <span className="truncate text-blue-100/90 dark:text-slate-300">{classInfo.section || '...'}</span>
              </h1>
              <div className="flex items-center gap-3 mt-1.5 font-black uppercase tracking-widest text-[9px]">
                <p className="text-blue-100/60 dark:text-slate-500 flex gap-3">
                  <span className="flex items-center gap-1"><Users size={11}/> {students.length} élèves</span>
                  <span className="flex items-center gap-1"><BookOpen size={11}/> {subjects.length} cours</span>
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap w-full md:w-auto">
            <button
              onClick={onRefresh}
              disabled={refreshing}
              className="p-2.5 bg-white/10 hover:bg-white hover:text-blue-600 dark:hover:text-slate-900 rounded-xl text-white transition-all duration-300 backdrop-blur-md shadow-lg shadow-black/5 hover:scale-105 active:scale-95 group shrink-0 disabled:opacity-50"
              title="Actualiser les données"
            >
              <RefreshCw size={18} className={`transition-transform duration-500 ${refreshing ? 'animate-spin' : 'group-hover:rotate-180'}`} />
            </button>
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10 backdrop-blur-md">
              <button
                onClick={onOpenPalmares}
                className="flex items-center gap-1.5 hover:bg-white hover:text-blue-600 px-4 py-2 rounded-lg font-black text-[9px] uppercase tracking-widest transition-all text-white border border-transparent"
              >
                <Award size={14} />
                <span>Palmarès</span>
              </button>
              <div className="flex items-center gap-1 px-1 border-l border-white/10 ml-0.5">
                <button onClick={onOpenCouponsPrint} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Coupons">
                  <Printer size={16} />
                </button>
                <button onClick={onOpenBulkPrint} className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all" title="Bulletins">
                  <FileText size={16} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-start border-t border-white/10 pt-3">
          <div className="flex items-center gap-3 w-full xl:w-auto flex-wrap">
            <div className="relative group flex-1 md:w-80">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-white transition-colors" size={16} />
              <input
                type="text"
                placeholder="Rechercher par nom..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-11 pr-4 py-2.5 bg-white/10 dark:bg-black/20 border border-white/10 rounded-xl text-white placeholder-white/30 focus:bg-white/15 outline-none font-bold text-xs transition-all"
              />
            </div>

            <div className="relative" ref={popoverRef}>
              <button
                onClick={() => setShowFiltersPopover(!showFiltersPopover)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95 ${
                  showFiltersPopover || selectedPeriods.size < ALL_PERIODS.length || focusedSubject !== 'all' || sortOrder !== 'asc' || correctionMax
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10 hover:text-white'
                }`}
              >
                <Search size={14} className="hidden" />
                <ArrowUpDown size={14} />
                Filtres & Affichage
                <ChevronDown size={12} className={`transition-transform duration-300 ${showFiltersPopover ? 'rotate-180' : ''}`} />
              </button>

              {showFiltersPopover && (
                <div className="absolute top-full mt-2 left-0 w-[380px] bg-slate-800 border border-slate-700 rounded-xl shadow-2xl z-50 p-5 flex flex-col gap-5 animate-in fade-in zoom-in-95 duration-200">
                  <div className="flex flex-col gap-2">
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Tri des élèves</span>
                    <div className="flex items-center gap-2 bg-slate-900/50 rounded-xl border border-white/10 p-1">
                      <button
                        onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                        className="p-2 hover:text-blue-400 text-white transition-all active:scale-95 border-r border-white/10"
                        title="Trier la liste (A-Z / Z-A)"
                      >
                        <ArrowUpDown size={14} className={`transition-transform duration-500 ${sortOrder === 'desc' ? 'rotate-180' : ''}`} />
                      </button>
                      <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value)}
                        className="bg-transparent flex-1 text-[10px] font-black uppercase tracking-widest text-white outline-none cursor-pointer p-1"
                      >
                        <option value="asc" className="bg-slate-800">Alpha (A-Z)</option>
                        <option value="desc" className="bg-slate-800">Alpha (Z-A)</option>
                        {customSorts.map(sort => (
                          <option key={`custom_${sort.id}`} value={`custom_${sort.id}`} className="bg-slate-800">{sort.name}</option>
                        ))}
                      </select>
                      {sortOrder.startsWith('custom_') && (
                        <div className="flex items-center gap-1 ml-1 border-l border-white/10 pl-1">
                          <button
                            onClick={() => {
                              const sort = customSorts.find(s => s.id === parseInt(sortOrder.replace('custom_', ''), 10));
                              if (sort) onEditCustomSort(sort);
                            }}
                            className="p-1.5 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-all"
                            title="Modifier ce tri"
                          >
                            <Edit size={12} />
                          </button>
                          <button
                            onClick={() => onDeleteCustomSort(parseInt(sortOrder.replace('custom_', ''), 10))}
                            className="p-1.5 hover:bg-red-500/20 rounded-lg text-white/70 hover:text-red-400 transition-all"
                            title="Supprimer ce tri"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      )}
                      <button
                        onClick={onCreateCustomSort}
                        className="ml-1 p-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-white/70 hover:text-white transition-all"
                        title="Créer un nouveau tri personnalisé"
                      >
                        <Plus size={12} />
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center justify-between">
                      <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Périodes affichées</span>
                      <div className="flex gap-1">
                        <button onClick={() => setSelectedPeriods(new Set(['P1', 'P2', 'EXAM1']))} className="text-[8px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white/80 transition-colors">Semestre 1</button>
                        <button onClick={() => setSelectedPeriods(new Set(['P3', 'P4', 'EXAM2']))} className="text-[8px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white/80 transition-colors">Semestre 2</button>
                        <button onClick={() => setSelectedPeriods(new Set(ALL_PERIODS))} className="text-[8px] font-black uppercase tracking-widest bg-slate-700 hover:bg-slate-600 px-2 py-0.5 rounded text-white/80 transition-colors">Tout</button>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 bg-slate-900/50 p-1.5 rounded-xl border border-white/10">
                      {ALL_PERIODS.map(p => (
                        <button
                          key={p}
                          onClick={() => {
                            setSelectedPeriods(prev => {
                              const next = new Set(prev);
                              if (next.has(p)) {
                                if (next.size > 1) next.delete(p);
                              } else {
                                next.add(p);
                              }
                              return next;
                            });
                          }}
                          className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-widest rounded transition-all ${
                            selectedPeriods.has(p)
                              ? 'bg-blue-500 text-white shadow'
                              : 'text-white/40 hover:text-white hover:bg-white/10'
                          }`}
                        >
                          {p.replace('EXAM', 'Ex')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <div className="flex flex-col gap-2 flex-1">
                      <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Filtrer par matière</span>
                      <select
                        value={focusedSubject === 'all' ? 'all' : String(focusedSubject)}
                        onChange={(e) => setFocusedSubject(e.target.value === 'all' ? 'all' : Number(e.target.value))}
                        className="bg-slate-900/50 border border-white/10 text-white px-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer"
                      >
                        <option value="all" className="bg-slate-800">Toutes les matières ({subjects.length})</option>
                        {subjects.map(s => (
                          <option key={s.id} value={s.id} className="bg-slate-800">{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex flex-col gap-2">
                      <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Corrigé sur</span>
                      <div className="flex items-center gap-1 bg-slate-900/50 border border-white/10 rounded-xl px-2 py-1.5 w-24">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={correctionMaxInput}
                          onChange={(e) => {
                            const raw = e.target.value;
                            if (/^[0-9]*\.?[0-9]*$/.test(raw)) setCorrectionMaxInput(raw);
                          }}
                          placeholder="Max"
                          className="w-full bg-transparent text-center text-white placeholder-white/30 outline-none font-black text-[10px]"
                        />
                        {correctionMax && (
                          <button onClick={() => setCorrectionMaxInput('')} className="p-1 text-white/40 hover:text-white rounded-lg"><RotateCcw size={10} /></button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 border-t border-white/10 pt-4">
                    <span className="text-white/40 text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5"><Lock size={10}/> Verrouiller des périodes (Édition bloquée)</span>
                    <div className="flex items-center gap-1">
                      {ALL_PERIODS.map(p => (
                        <button
                          key={`lock_${p}`}
                          onClick={() => toggleLockPeriod(p)}
                          className={`flex-1 flex items-center justify-center p-1.5 rounded-lg transition-all border ${
                            lockedPeriods.has(p)
                              ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                              : 'bg-slate-900/50 text-white/40 border-white/10 hover:text-white hover:bg-white/10'
                          }`}
                          title={lockedPeriods.has(p) ? `Déverrouiller ${p}` : `Verrouiller ${p}`}
                        >
                          {lockedPeriods.has(p) ? <Lock size={10} /> : <Unlock size={10} />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4 border-t border-white/10 pt-4 pb-1">
                    <div className="flex items-center justify-between">
                      <span className="text-red-400 text-[10px] font-black uppercase tracking-widest">N'afficher que les abandons ({students.filter(s => Boolean((s as Student).is_abandoned)).length})</span>
                      <button
                        onClick={() => setShowOnlyAbandons(prev => !prev)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${showOnlyAbandons ? 'bg-red-500' : 'bg-slate-600'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showOnlyAbandons ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-white/70 text-[10px] font-black uppercase tracking-widest">Afficher les statistiques de classe</span>
                      <button
                        onClick={() => setShowStats(!showStats)}
                        className={`w-10 h-5 rounded-full relative transition-colors ${showStats ? 'bg-blue-500' : 'bg-slate-600'}`}
                      >
                        <div className={`w-3 h-3 bg-white rounded-full absolute top-1 transition-all ${showStats ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full xl:w-auto justify-start flex-wrap mt-2 xl:mt-0 border-l-0 xl:border-l xl:border-white/10 xl:pl-4">
            <button onClick={onExportCSV} className="p-2.5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95" title="Exporter en CSV"><Download size={16} /></button>
            <button onClick={onToggleFullscreen} className="p-2.5 bg-white/5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl border border-white/10 transition-all active:scale-95" title={isFullscreen ? 'Quitter le plein écran' : 'Mode Focus'}>
              {isFullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
            </button>
            <button
              onClick={onShowAddSubject}
              className="flex items-center gap-2 bg-indigo-500/20 hover:bg-indigo-500 text-indigo-100 px-4 py-2.5 rounded-xl border border-indigo-500/30 font-black text-[10px] uppercase tracking-widest transition-all shadow-lg active:scale-95"
            >
              <BookOpen size={14} />
              <span>Gérer les cours</span>
            </button>
            <button
              onClick={onShowAddStudent}
              className="flex items-center gap-2 bg-white text-blue-600 dark:bg-blue-600 dark:text-white px-4 py-2.5 rounded-xl hover:bg-blue-50 transition-all font-black text-[10px] uppercase tracking-widest shadow-xl active:scale-95"
            >
              <Plus size={14} />
              <span>Ajouter un élève</span>
            </button>
          </div>
        </div>

        {showStats && (
          <div className="flex flex-wrap items-center gap-3 pt-3 animate-in fade-in duration-300">
            <span className="text-white/40 text-[9px] font-black uppercase tracking-widest">Saisie:</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {ALL_PERIODS.filter(p => selectedPeriods.has(p)).map(p => {
                const d = progressData[p];
                if (!d || d.total === 0) return null;
                const pct = Math.round((d.filled / d.total) * 100);
                return (
                  <div key={p} className="flex items-center gap-1 bg-white/5 px-2 py-1 rounded-lg border border-white/10" title={`${d.filled}/${d.total} notes remplies`}>
                    <span className="text-[8px] font-black text-white/40 uppercase">{p.replace('EXAM', 'Ex')}</span>
                    <div className="w-8 h-1 bg-white/10 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${pct === 100 ? 'bg-emerald-400' : pct > 50 ? 'bg-blue-400' : 'bg-amber-400'}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
