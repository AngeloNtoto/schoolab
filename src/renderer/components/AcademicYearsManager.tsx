import React, { useState, useEffect } from 'react';
import { academicYearService, AcademicYear } from '../services/academicYearService';
import { CalendarRange, Plus, Check, Trash2, Calendar } from 'lucide-react';
import { useToast } from '../context/ToastContext';

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

  if (loading) return <div>Chargement...</div>;

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
             <div className="bg-blue-600 p-2 rounded-lg text-white">
                <CalendarRange size={24} />
             </div>
             <div>
                <h1 className="text-2xl font-bold text-slate-800">Années Académiques</h1>
                <p className="text-slate-500">Gérez les périodes scolaires</p>
             </div>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 font-medium hover:bg-blue-700 transition"
        >
          <Plus size={18} />
          Nouvelle Année
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-lg shadow-md border border-slate-200 mb-8 animate-in fade-in slide-in-from-top-4">
            <h3 className="text-lg font-bold mb-4">Nouvelle Période</h3>
            <form onSubmit={handleCreate} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom (ex: 2025-2026)</label>
                    <input 
                      type="text" 
                      value={name} 
                      onChange={e => setName(e.target.value)} 
                      required
                      placeholder="2025-2026"
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                    />
                </div>
                <div className="grid grid-cols-2 gap-4">
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Début</label>
                        <input 
                          type="date"
                          value={startDate} 
                          onChange={e => setStartDate(e.target.value)} 
                          required
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                     </div>
                     <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Fin</label>
                         <input 
                          type="date"
                          value={endDate} 
                          onChange={e => setEndDate(e.target.value)} 
                          required
                          className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
                        />
                     </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                    <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Annuler</button>
                    <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Créer</button>
                </div>
            </form>
        </div>
      )}

      <div className="grid gap-4">
        {years.map(year => (
            <div key={year.id} className={`p-4 rounded-xl border flex items-center justify-between transition-all ${year.is_active ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 hover:border-blue-300'}`}>
                <div>
                     <div className="flex items-center gap-3 mb-1">
                        <h3 className="text-lg font-bold text-slate-800">{year.name}</h3>
                        {year.is_active && (
                            <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Check size={12} /> Active
                            </span>
                        )}
                     </div>
                     <div className="text-sm text-slate-500 flex items-center gap-4">
                        <span className="flex items-center gap-1"><Calendar size={14} /> {year.start_date}</span>
                        <span>à</span>
                        <span className="flex items-center gap-1"><Calendar size={14} /> {year.end_date}</span>
                     </div>
                </div>
                <div className="flex items-center gap-2">
                    {!year.is_active && (
                        <button 
                            onClick={() => handleSetActive(year.id)}
                            className="px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-100 rounded-lg transition"
                        >
                            Définir comme active
                        </button>
                    )}
                    <button 
                        onClick={() => handleDelete(year.id)}
                        className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                        title="Supprimer"
                    >
                        <Trash2 size={18} />
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
  );
}
