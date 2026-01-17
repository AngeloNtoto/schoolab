import React, { useState, useEffect, useActionState } from 'react';
import { dbService } from '../../services/databaseService';
import { useFormStatus } from 'react-dom';
import { X, School, Save, Layers, BookOpen, Plus, Trash2, Check, Sparkles, Settings2, GraduationCap } from '../iconsSvg';
import { LEVELS } from '../../../constants/school';
import { getClassDisplayName } from '../../lib/classUtils';
import { useToast } from '../../context/ToastContext';


interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

interface Domain {
  id: number;
  name: string;
  display_order: number;
}

interface SchoolOption {
  id: number;
  label: string;
  value: string;
  short: string;
}

interface EditClassModalProps {
  classData?: Class | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditClassModal({ classData, onClose, onSuccess }: EditClassModalProps) {
  const [activeTab, setActiveTab] = useState<'identity' | 'config'>('identity');
  const [activeConfigSection, setActiveConfigSection] = useState<'options' | 'domains'>('options');
  
  const [name, setName] = useState(classData?.name || '');
  const [level, setLevel] = useState(classData?.level || LEVELS[0]);
  const [option, setOption] = useState(classData?.option || ''); // Will be set after loading options
  const [section, setSection] = useState(classData?.section || (classData?.level === '7ème' || classData?.level === '8ème' ? 'A' : '-'));
  const [academicYearId, setAcademicYearId] = useState<number | null>(null);
  
  // Data state
  const [domains, setDomains] = useState<Domain[]>([]);
  const [optionList, setOptionList] = useState<SchoolOption[]>([]);
  
  // New entry state
  const [newDomainName, setNewDomainName] = useState('');
  const [newOptionName, setNewOptionName] = useState('');
  const [newOptionShort, setNewOptionShort] = useState('');
  const [loadingConfig, setLoadingConfig] = useState(false);

  const toast = useToast();

  // Auto-adjust section when level changes to/from 7ème/8ème
  useEffect(() => {
    if (!classData && (level === '7ème' || level === '8ème') && section === '-') {
      setSection('A');
    }
  }, [level, classData]);

  // Auto-update name
  useEffect(() => {
    if (!classData) {
      // Find selected option object
      const selectedOpt = optionList.find(o => o.value === option);
      // Determine what to display: if EB level, force 'EB'. Else use selected option value/label
      let currentOptionCode = option;
      
      if (level === '7ème' || level === '8ème') {
        currentOptionCode = 'EB';
      } else if (selectedOpt) {
        currentOptionCode = selectedOpt.value;
      }

      // If option is empty and not EB level, don't update name yet
      if (!currentOptionCode && level !== '7ème' && level !== '8ème') return;

      setName(getClassDisplayName(level, currentOptionCode, section));
      
      if (level === '7ème' || level === '8ème') {
        if (option !== 'EB') setOption('EB');
      }
    }
  }, [level, section, option, classData, optionList]);

  // Fetch initial data
  useEffect(() => {
    const init = async () => {
      try {
        const ayResult = await dbService.query<{ id: number }>('SELECT id FROM academic_years WHERE is_active = 1');
        if (ayResult.length > 0) {
          setAcademicYearId(ayResult[0].id);
        } else {
          toast.error("Aucune année académique active.");
          onClose();
          return;
        }

        await fetchConfig();
      } catch (error) {
        console.error('Failed to init modal:', error);
      }
    };
    init();
  }, []);

  // Set initial option selection after fetching options
  useEffect(() => {
    if (optionList.length > 0 && !option) {
       // If editing, try to match existing option
       if (classData) {
         setOption(classData.option);
       } else {
         // Default to first available if not 7/8eme (managed by other effect)
         if (level !== '7ème' && level !== '8ème') {
            const defaultOpt = optionList.find(o => o.value !== 'EB');
            // Prefer 'EB' not being selected for higher levels if possible, but actually we filtered EB out in UI for > 8eme usually
            // Just select first one
            if (defaultOpt) setOption(defaultOpt.value);
         }
       }
    }
  }, [optionList, classData, option]);


  const fetchConfig = async () => {
    setLoadingConfig(true);
    try {
      // Load Domains
      const doms = await dbService.query<Domain>('SELECT * FROM domains ORDER BY display_order ASC, name ASC');
      setDomains(doms);

      // Load Options
      // Fallback: If table doesn't exist yet (rare race condition if db.ts hasn't run), this might fail.
      // But assuming db.ts ran.
      const opts = await dbService.query<SchoolOption>('SELECT * FROM options ORDER BY display_order ASC, label ASC');
      setOptionList(opts);
    } catch (e) {
      console.error("Error fetching config", e);
    } finally {
      setLoadingConfig(false);
    }
  };

  const handleAddDomain = async () => {
    if (!newDomainName.trim()) return;
    try {
      await dbService.execute('INSERT INTO domains (name, display_order, is_dirty) VALUES (?, ?, 1)', [newDomainName.trim(), domains.length + 1]);
      setNewDomainName('');
      toast.success("Domaine ajouté");
      fetchConfig();
    } catch (e) {
      toast.error("Erreur ajout domaine");
    }
  };

  const handleDeleteDomain = async (id: number) => {
    if(!confirm("Supprimer ce domaine ?")) return;
    try {
      await dbService.execute('DELETE FROM domains WHERE id = ?', [id]);
      await dbService.execute('INSERT INTO sync_deletions (table_name, local_id) VALUES (?, ?)', ['domains', id]);
      toast.success("Domaine supprimé");
      fetchConfig();
    } catch (e) {
      toast.error("Impossible de supprimer (utilisé ?)");
    }
  };

  const handleAddOption = async () => {
    if (!newOptionName.trim()) return;
    try {
      // Create a code from the name (upper case, no spaces)
      const code = newOptionName.toUpperCase().replace(/\s+/g, '_').replace(/[^A-Z0-9_]/g, '');
      const short = newOptionShort.trim().toUpperCase() || code.substring(0, 4);

      await dbService.execute(
        'INSERT INTO options (label, value, short, display_order, is_dirty) VALUES (?, ?, ?, ?, 1)', 
        [newOptionName.trim(), code, short, optionList.length + 1]
      );
      setNewOptionName('');
      setNewOptionShort('');
      toast.success("Option ajoutée");
      fetchConfig();
    } catch (e) {
      console.error(e);
      toast.error("Erreur ajout option (Doublon ?)");
    }
  };

  const handleDeleteOption = async (id: number) => {
    if(!confirm("Supprimer cette option de la liste ? \n\nNOTE: Les classes existantes utilisant cette option conserveront leur nom, mais l'option ne sera plus proposée pour les nouvelles classes.")) return;
    try {
      await dbService.execute('DELETE FROM options WHERE id = ?', [id]);
      await dbService.execute('INSERT INTO sync_deletions (table_name, local_id) VALUES (?, ?)', ['options', id]);
      toast.success("Option retirée de la liste");
      fetchConfig();
    } catch (e) {
      toast.error("Erreur suppression");
    }
  };

  // React 19 Action for class saving
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData): Promise<any> => {
    if (!academicYearId) return { success: false };

    try {
      const submitData = {
        name: formData.get('name') as string,
        level: formData.get('level') as string,
        option: option, // Use state option
        section: formData.get('section') as string,
      };

      if (!submitData.name) {
         toast.error("Le nom est requis");
         return { success: false };
      }

      // Check duplicates
      const query = `
        SELECT id FROM classes 
        WHERE name = ? AND level = ? AND option = ? AND section = ? AND academic_year_id = ?
        ${classData ? 'AND id != ?' : ''}
      `;
      const params = [submitData.name, submitData.level, submitData.option, submitData.section, academicYearId];
      if (classData) params.push(classData.id);

      const dupResult = await dbService.query<{ id: number }>(query, params);
      if (dupResult.length > 0) {
        toast.warning("Une classe identique existe déjà.");
        return { success: false, error: 'duplicate' };
      }

      // Save
      if (classData) {
        await dbService.execute(
          'UPDATE classes SET name = ?, level = ?, option = ?, section = ?, is_dirty = 1 WHERE id = ?',
          [submitData.name, submitData.level, submitData.option, submitData.section, classData.id]
        );
      } else {
        await dbService.execute(
          'INSERT INTO classes (name, level, option, section, academic_year_id, is_dirty) VALUES (?, ?, ?, ?, ?, 1)',
          [submitData.name, submitData.level, submitData.option, submitData.section, academicYearId]
        );
      }
      
      toast.success(classData ? 'Classe mise à jour' : 'Classe créée avec succès');
      onSuccess();
      onClose();
      return { success: true };
    } catch (error) {
      console.error('Failed to save class:', error);
      toast.error('Erreur sauvegarde');
      return { success: false, error: 'failed' };
    }
  }, null);

  if (!academicYearId) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-[#020617] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 w-full max-w-2xl flex flex-col h-auto max-h-[85vh] animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-6 relative overflow-hidden shrink-0 transition-colors duration-500">
            <div className="absolute top-0 right-0 p-8 text-white/5 rotate-12 pointer-events-none">
                <School size={120} />
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 dark:bg-blue-600/30 p-3 rounded-2xl backdrop-blur-md shadow-lg">
                        <School size={28} className="text-white" />
                    </div>
                    <div>
                        <p className="text-blue-100/80 font-black uppercase tracking-widest text-[10px] mb-1">Portail Académique</p>
                        <h2 className="text-2xl font-black text-white tracking-tight">
                            {classData ? 'Modifier la classe' : 'Nouvelle Classe'}
                        </h2>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 mx-8 mt-6 rounded-2xl border border-slate-100 dark:border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('identity')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'identity' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Layers size={14} /> Identité de classe
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all ${activeTab === 'config' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'}`}
          >
            <Settings2 size={14} /> Paramètres & Options
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 pt-6 custom-scrollbar">
            {activeTab === 'identity' ? (
              <div 
                className="animate-in slide-in-from-left-4 duration-300"
              >
                <form action={formAction} className="space-y-6">
                    {/* Level & Section Row */}
                    <div className="grid grid-cols-2 gap-5">
                       <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Niveau scolaire</label>
                           <div className="relative">
                             <select 
                                 name="level" 
                                 value={level}
                                 onChange={(e) => setLevel(e.target.value)}
                                 required
                                 className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                             >
                                 {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                             </select>
                             <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <Layers size={16} />
                             </div>
                           </div>
                       </div>
                       <div className="space-y-2">
                           <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Section</label>
                           <div className="relative">
                             <select 
                                 name="section" 
                                 value={section}
                                 onChange={(e) => setSection(e.target.value)}
                                 required
                                 className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none"
                             >
                                 {(level !== '7ème' && level !== '8ème') && <option value="-">Aucune (-)</option>}
                                 {['A', 'B', 'C', 'D', 'E', 'F', 'G'].map(s => <option key={s} value={s}>{s}</option>)}
                             </select>
                           </div>
                       </div>
                    </div>

                    {/* Options Row */}
                    <div className="space-y-2">
                         <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Orientation / Option</label>
                         <div className="relative">
                            <select 
                                value={option}
                                onChange={(e) => setOption(e.target.value)}
                                disabled={level === '7ème' || level === '8ème'}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-sm font-bold text-slate-700 dark:text-slate-200 outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none disabled:bg-slate-100 dark:disabled:bg-slate-800 disabled:opacity-60"
                            >
                                {optionList
                                    .filter(o => (level === '7ème' || level === '8ème') ? o.value === 'EB' : o.value !== 'EB')
                                    .map(o => (
                                    <option key={o.id || o.value} value={o.value}>{o.label}</option>
                                ))}
                            </select>
                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                               <GraduationCap size={16} />
                             </div>
                         </div>
                         {(level === '7ème' || level === '8ème') && (
                            <p className="text-[9px] text-blue-500 font-bold mt-2 px-1">
                                ℹ️ L'option est fixée à "Éducation de Base" pour ce niveau.
                            </p>
                        )}
                         {!(level === '7ème' || level === '8ème') && (
                            <p className="text-[9px] text-slate-400 font-bold mt-2 px-1 flex items-center gap-1 cursor-pointer hover:text-blue-500 transition-colors" onClick={() => { setActiveTab('config'); setActiveConfigSection('options'); }}>
                                <Settings2 size={10} />
                                Gérer les options disponibles
                            </p>
                         )}
                    </div>

                    <div className="h-px bg-slate-100 dark:bg-white/5 my-6" />

                    {/* Name Preview */}
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Nom final (Editable)</label>
                        <div className="relative group">
                          <input 
                              name="name" 
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              required 
                              className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-2xl text-lg font-black text-slate-800 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all text-center tracking-tight group-hover:bg-slate-100 dark:group-hover:bg-white/5" 
                              placeholder="7ème EB A"
                          />
                          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hidden group-hover:block animate-in fade-in">
                             <Check size={20} className="text-green-500" />
                          </div>
                        </div>
                        <p className="text-[10px] text-slate-400 text-center font-medium mt-2">
                           Ce nom sera utilisé sur les bulletins et les listes.
                        </p>
                    </div>

                    <div className="pt-6 flex gap-4">
                       <button type="button" onClick={onClose} className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-500 font-black uppercase text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                         Annuler
                       </button>
                       <SubmitButton />
                    </div>
                </form>
              </div>
            ) : (
              <div 
                className="space-y-6 h-full flex flex-col animate-in slide-in-from-right-4 duration-300"
              >
                  {/* Segmented Control for Sub-tabs */}
                  <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl shrink-0">
                      <button 
                        onClick={() => setActiveConfigSection('options')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeConfigSection === 'options' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          Options
                      </button>
                      <button 
                        onClick={() => setActiveConfigSection('domains')}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${activeConfigSection === 'domains' ? 'bg-white dark:bg-slate-700 shadow-sm text-slate-900 dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                      >
                          Domaines de Cours
                      </button>
                  </div>

                  {activeConfigSection === 'options' ? (
                       <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                           <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl flex items-start gap-3 shrink-0">
                              <GraduationCap className="text-blue-600 shrink-0 mt-0.5" size={18} />
                              <div>
                                  <p className="text-[11px] font-bold text-blue-900 dark:text-blue-200">Gestion des Options</p>
                                  <p className="text-[10px] text-blue-700 dark:text-blue-300/80 leading-relaxed mt-1">
                                    Définissez les orientations disponibles (ex: Bio-Chimie, Couture). La suppression n'affecte pas les classes déjà créées.
                                  </p>
                              </div>
                           </div>

                             {/* Add Option */}
                            <div className="flex gap-2 shrink-0">
                                <div className="flex-1 flex gap-2">
                                  <input 
                                      value={newOptionName}
                                      onChange={(e) => setNewOptionName(e.target.value)}
                                      placeholder="Nouvelle option (ex: Bio-Chimie)"
                                      className="flex-[2] px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500"
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                  />
                                  <input 
                                      value={newOptionShort}
                                      onChange={(e) => setNewOptionShort(e.target.value.toUpperCase())}
                                      placeholder="Code (BIO)"
                                      maxLength={5}
                                      className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 uppercase placeholder:normal-case"
                                      onKeyDown={(e) => e.key === 'Enter' && handleAddOption()}
                                  />
                                </div>
                                <button 
                                    onClick={handleAddOption}
                                    disabled={!newOptionName.trim()}
                                    className="px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 text-white rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-white/5 p-2 space-y-1 custom-scrollbar">
                                {optionList.filter(o => o.value !== 'EB').map((opt) => (
                                    <div key={opt.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5 hover:border-blue-200 dark:hover:border-blue-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-[10px] font-black text-blue-600 dark:text-blue-400">
                                                {opt.short}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{opt.label}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteOption(opt.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Supprimer de la liste"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                       </div>
                  ) : (
                       <div className="flex-1 flex flex-col space-y-4 overflow-hidden">
                            <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-2xl flex items-start gap-3 shrink-0">
                                <BookOpen className="text-purple-600 shrink-0 mt-0.5" size={18} />
                                <div>
                                    <p className="text-[11px] font-bold text-purple-900 dark:text-purple-200">Domaines de Cours</p>
                                    <p className="text-[10px] text-purple-700 dark:text-purple-300/80 leading-relaxed mt-1">
                                        Les domaines regroupent les cours sur les bulletins. Ils sont partagés entre toutes les classes.
                                    </p>
                                </div>
                            </div>

                             {/* Add Domain */}
                            <div className="flex gap-2 shrink-0">
                                <input 
                                    value={newDomainName}
                                    onChange={(e) => setNewDomainName(e.target.value)}
                                    placeholder="Nouveau domaine (ex: Arts)"
                                    className="flex-1 px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500"
                                    onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
                                />
                                <button 
                                    onClick={handleAddDomain}
                                    disabled={!newDomainName.trim()}
                                    className="px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:hover:bg-purple-600 text-white rounded-xl shadow-lg shadow-purple-500/20 transition-all active:scale-95"
                                >
                                    <Plus size={20} />
                                </button>
                            </div>

                            {/* List */}
                            <div className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-100 dark:border-white/5 p-2 space-y-1 custom-scrollbar">
                                {domains.map((dom) => (
                                    <div key={dom.id} className="group flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-white/5 hover:border-purple-200 dark:hover:border-purple-500/30 transition-all">
                                        <div className="flex items-center gap-3">
                                            <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-[10px] font-black text-slate-500">
                                                {dom.display_order}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{dom.name}</span>
                                        </div>
                                        <button 
                                            onClick={() => handleDeleteDomain(dom.id)}
                                            className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                       </div>
                  )}
              </div>
            )}
        </div>
      </div>
    </div>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {pending ? (
        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
      ) : (
        <Save size={20} />
      )}
      {pending ? 'Enregistrement...' : 'Enregistrer la classe'}
    </button>
  );
}
