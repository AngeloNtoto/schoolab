import React, { useState, useEffect } from 'react';
import { academicYearService, AcademicYear } from '../../services/academicYearService';
import { CalendarRange, Plus, Check, Trash2, Calendar } from '../iconsSvg';
import { useToast } from '../../context/ToastContext';
import ProfessionalLoader from '../ui/ProfessionalLoader';

export default function AcademicYearsManager() {
  const [years, setYears] = useState<AcademicYear[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  
  // Form state
  const [name, setName] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const toast = useToast();

  useEffect(() => {
    loadYears();
  }, []);

  const loadYears = async () => {
    try {
      const data = await academicYearService.getAll();
      setYears(data);
    } catch (err) {
      toast.error("Erreur lors du chargement des années académiques");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (new Date(startDate) >= new Date(endDate)) {
        toast.error("La date de début doit être antérieure à la date de fin.");
        return;
      }
      await academicYearService.create(name, startDate, endDate);
      toast.success("Année académique créée");
      setShowForm(false);
      resetForm();
      loadYears();
    } catch (err) {
      toast.error("Erreur lors de la création");
    }
  };

  const handleSetActive = async (id: number) => {
    try {
      await academicYearService.setActive(id);
      await loadYears();
      toast.success("Année active mise à jour");
    } catch (err) {
      toast.error("Erreur lors de la mise à jour");
    }
  };

  const handleDelete = async (id: number) => {
     if(!confirm("Êtes-vous sûr ? Cela pourrait affecter les données liées.")) return;
     try {
       await academicYearService.delete(id);
       await loadYears();
       toast.success("Année supprimée");
     } catch (err) {
        toast.error("Erreur lors de la suppression");
     }
  };

  const resetForm = () => {
    setName('');
    setStartDate('');
    setEndDate('');
  };

  return (
    <div className="h-full overflow-y-auto bg-slate-50/50 dark:bg-slate-950 transition-colors duration-500">
      <div className="bg-blue-600 dark:bg-slate-900/50 border-b border-transparent dark:border-white/5 px-8 py-10 shadow-lg mb-8 transition-colors backdrop-blur-xl">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
               <div className="bg-white/20 dark:bg-blue-600/30 p-3 rounded-2xl shadow-xl backdrop-blur-md transition-colors">
                  <CalendarRange size={28} className="text-white dark:text-blue-400" />
               </div>
               <div>
                  <h1 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">Années Académiques</h1>
                  <p className="text-blue-100 dark:text-slate-500 font-bold uppercase tracking-widest text-[10px]">Gérez les périodes scolaires</p>
               </div>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="bg-white dark:bg-blue-600 text-blue-600 dark:text-white px-6 py-3 rounded-2xl flex items-center gap-3 font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 dark:hover:bg-blue-700 transition-all shadow-2xl shadow-blue-500/20 active:scale-[0.98]"
          >
            <Plus size={18} />
            Nouvelle Année
          </button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-12">
        {loading ? (
           <ProfessionalLoader message="Chargement des périodes..." fullScreen={false} />
        ) : (
          <div className="space-y-10">
            {showForm && (
              <div 
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in duration-300"
                onClick={() => setShowForm(false)}
              >
                <div 
                  className="bg-white dark:bg-slate-900/50 backdrop-blur-xl p-8 rounded-[2.3rem] shadow-2xl border border-slate-200 dark:border-white/5 w-full max-w-lg animate-in zoom-in-95 duration-300"
                  onClick={(e) => e.stopPropagation()}
                >
                    <div className="flex items-center justify-between mb-6">
                        <div className="bg-blue-600/10 p-2.5 rounded-xl">
                            <Plus size={20} className="text-blue-600" />
                        </div>
                        <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg transition-colors">
                            <X size={18} className="text-slate-400" />
                        </button>
                    </div>
                    <h3 className="text-xl font-black text-slate-800 dark:text-white mb-6 uppercase tracking-widest text-[10px]">Nouvelle Période</h3>
                    <form onSubmit={handleCreate} className="space-y-4">
                        <div>
                            <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Nom (ex: 2025-2026)</label>
                            <input 
                              type="text" 
                              value={name} 
                              onChange={e => setName(e.target.value)} 
                              required
                              placeholder="2025-2026"
                              className="w-full px-5 py-3 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Début</label>
                                <input 
                                  type="date"
                                  value={startDate} 
                                  onChange={e => {
                                    setStartDate(e.target.value);
                                    if (e.target.value) e.target.blur();
                                  }} 
                                  required
                                  className="w-full px-5 py-3 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                                />
                             </div>
                             <div>
                                <label className="block text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest mb-1.5 px-1">Fin</label>
                                 <input 
                                  type="date"
                                  value={endDate} 
                                  onChange={e => {
                                    setEndDate(e.target.value);
                                    if (e.target.value) e.target.blur();
                                  }} 
                                  required
                                  min={startDate}
                                  className="w-full px-5 py-3 bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                                />
                             </div>
                        </div>
                        <div className="flex justify-end gap-3 pt-6">
                            <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-6 py-3 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl transition-all">Annuler</button>
                            <button type="submit" className="flex-[2] px-8 py-3 bg-blue-600 text-white rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-blue-700 shadow-xl shadow-blue-500/20 transition-all active:scale-95">Créer la période</button>
                        </div>
                    </form>
                </div>
              </div>
            )}

            <div className="grid gap-6">
              {years.map(year => (
                  <div key={year.id} className={`p-6 rounded-[2rem] border-2 flex items-center justify-between transition-all group overflow-hidden relative ${year.is_active ? 'bg-blue-50/50 dark:bg-blue-600/10 border-blue-200 dark:border-blue-500/30 shadow-xl shadow-blue-500/10' : 'bg-white dark:bg-slate-900/50 backdrop-blur-xl border-white dark:border-white/5 hover:border-slate-200 dark:hover:border-blue-500/30 shadow-lg shadow-slate-200/40 dark:shadow-black/40'}`}>
                      <div>
                           <div className="flex items-center gap-4 mb-2">
                              <h3 className="text-2xl font-black text-slate-800 dark:text-white tracking-tight">{year.name}</h3>
                              {year.is_active && (
                                  <span className="bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full flex items-center gap-2 shadow-lg shadow-blue-500/20">
                                      <Check size={14} strokeWidth={3} /> Active
                                  </span>
                              )}
                           </div>
                           <div className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 flex items-center gap-6">
                              <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-black/20 rounded-lg"><Calendar size={14} className="text-blue-500" /> {year.start_date}</span>
                              <span className="opacity-30">──────────</span>
                              <span className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-black/20 rounded-lg"><Calendar size={14} className="text-indigo-500" /> {year.end_date}</span>
                           </div>
                      </div>
                      <div className="flex items-center gap-3 relative z-10">
                          {!year.is_active && (
                              <button 
                                  onClick={() => handleSetActive(year.id)}
                                  className="px-6 py-3 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-xl transition-all active:scale-95"
                              >
                                  Définir comme active
                              </button>
                          )}
                          <button 
                              onClick={() => handleDelete(year.id)}
                              className="p-3.5 text-slate-400 hover:text-white hover:bg-red-500 dark:hover:bg-red-600 rounded-xl transition-all border border-transparent hover:shadow-xl active:scale-95"
                              title="Supprimer"
                          >
                              <Trash2 size={20} />
                          </button>
                      </div>
                  </div>
              ))}

              {years.length === 0 && (
                  <div className="text-center py-10 text-slate-500">
                      Aucune année académique enregistrée.
                  </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
