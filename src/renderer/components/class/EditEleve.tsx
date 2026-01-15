import React, { useState, useEffect } from 'react';
import { studentService, Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { User, Calendar, MapPin, Award, ShieldAlert, X, Save, GraduationCap, Info, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface EditEleveProps {
    studentId: number | null;
    initialData?: Student; // Données passées par le parent (optimisation)
    onClose: (updatedStudent?: Student) => void;
}

export default function EditEleve({ studentId, initialData, onClose}: EditEleveProps) {
    const toast = useToast();
    const [isAbandon, setIsAbandon] = useState<Number | Boolean>();
    
    // Initialisation synchrone si initialData est présent
    const [formData, setFormData] = useState<Partial<Student>>(() => {
        if (initialData) {
            return {
                first_name: initialData.first_name,
                last_name: initialData.last_name,
                post_name: initialData.post_name,
                gender: initialData.gender,
                birth_date: initialData.birth_date,
                birthplace: initialData.birthplace,
                conduite: initialData.conduite ?? '',
                conduite_p1: (initialData as any).conduite_p1 ?? '',
                conduite_p2: (initialData as any).conduite_p2 ?? '',
                conduite_p3: (initialData as any).conduite_p3 ?? '',
                conduite_p4: (initialData as any).conduite_p4 ?? '',
                class_id: initialData.class_id,
                is_abandoned: (initialData as any).is_abandoned ? true : false,
                abandon_reason: (initialData as any).abandon_reason ?? '',
            };
        }
        return {
            first_name: '',
            last_name: '',
            post_name: '',
            gender: '',
            birth_date: '',
            birthplace: '',
            conduite: '',
            conduite_p1: '',
            conduite_p2: '',
            conduite_p3: '',
            conduite_p4: '',
            class_id: undefined,
            is_abandoned: false,
            abandon_reason: '',
        };
    });

    // Si on a initialData, on n'est pas en loading
    const [loading, setLoading] = useState(!initialData);
    const [error, setError] = useState<string | null>(null);

    // Fetch fallback seulement si pas d'initialData
    useEffect(() => {
        if (!studentId || initialData) return;
        
        const fetchEleve = async (id: number) => {
            try {
                const data = await studentService.getStudentById(id);
                if (!data) {
                    setError('Élève introuvable');
                    setLoading(false);
                    return;
                }
                setFormData({
                    first_name: data.first_name,
                    last_name: data.last_name,
                    post_name: data.post_name,
                    gender: data.gender,
                    birth_date: data.birth_date,
                    birthplace: data.birthplace,
                    conduite: data.conduite ?? '',
                    conduite_p1: (data as any).conduite_p1 ?? '',
                    conduite_p2: (data as any).conduite_p2 ?? '',
                    conduite_p3: (data as any).conduite_p3 ?? '',
                    conduite_p4: (data as any).conduite_p4 ?? '',
                    class_id: data.class_id,
                    is_abandoned: (data as any).is_abandoned ? true : false,
                    abandon_reason: (data as any).abandon_reason ?? '',
                });
            } catch (err) {
                console.error(err);
                setError('Erreur lors du chargement de l\'élève');
            } finally {
                setLoading(false);
            }
        };
        
        fetchEleve(studentId);
    }, [studentId, initialData]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!studentId) return;
        try {
            // Mettre à jour l'élève dans la base de données
            await studentService.updateStudent(studentId, {
                first_name: formData.first_name,
                last_name: formData.last_name,
                post_name: formData.post_name,
                gender: formData.gender,
                birth_date: formData.birth_date,
                birthplace: formData.birthplace,
                conduite: formData.conduite,
                conduite_p1: (formData as any).conduite_p1,
                conduite_p2: (formData as any).conduite_p2,
                conduite_p3: (formData as any).conduite_p3,
                conduite_p4: (formData as any).conduite_p4,
                is_abandoned: (formData as any).is_abandoned,
                abandon_reason: (formData as any).abandon_reason,
            });
            
            setIsAbandon(formData.is_abandoned);
            toast.success('Élève mis à jour');
            
            // OPTIMISATION : Récupérer les données à jour de l'élève
            // et les passer au parent pour une mise à jour locale
            // Cela évite de recharger toute la liste des élèves
            const updatedStudent = await studentService.getStudentById(studentId);
            onClose(updatedStudent || undefined);
        } catch (err) {
            console.error(err);
            setError('Erreur lors de la mise à jour');
            toast.error('Erreur lors de la mise à jour');
        }
    };

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-500 font-bold uppercase tracking-widest text-[10px]">Chargement de l'élève...</p>
        </div>
    );

    const isAbandoned = (formData as any).is_abandoned;

    return (
        <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/5 max-w-xl mx-auto w-full">
            {/* Header section with blue gradient */}
            <div className="bg-blue-600 dark:bg-slate-900 px-8 py-8 relative overflow-hidden transition-colors duration-500">
                <div className="absolute top-0 right-0 p-10 text-white/5 rotate-12">
                    <GraduationCap size={140} />
                </div>
                
                <div className="relative z-10 flex items-center justify-between">
                    <div className="flex items-center gap-5">
                        <div className="bg-white/20 dark:bg-blue-600/30 p-3 rounded-2xl shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
                            <User size={28} className="text-white dark:text-blue-400" />
                        </div>
                        <div>
                            <p className="text-blue-100 dark:text-blue-400/60 font-black uppercase tracking-[0.2em] text-[9px] mb-1">Portail de gestion</p>
                            <h2 className="text-2xl font-black text-white dark:text-slate-100 tracking-tight">
                                {formData.first_name} <span className="text-blue-200 dark:text-blue-500">{formData.last_name}</span>
                            </h2>
                        </div>
                    </div>
                    <button 
                        onClick={() => onClose()} 
                        className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-md transition-all active:scale-95"
                    >
                        <X size={18} />
                    </button>
                </div>
            </div>

            {error && (
                <div className="mx-8 mt-6 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/20 rounded-2xl flex items-center gap-3 text-red-600 dark:text-red-400 animate-in fade-in slide-in-from-top-4">
                    <AlertTriangle size={20} />
                    <p className="text-sm font-bold">{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="p-6 space-y-8">
                {/* Section: Identité */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">État Civil & Identité</h3>
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Nom de famille</label>
                            <div className="relative group">
                                <input 
                                    name="last_name" 
                                    value={formData.last_name || ''} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                                />
                                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Prénom</label>
                            <div className="relative group">
                                <input 
                                    name="first_name" 
                                    value={formData.first_name || ''} 
                                    onChange={handleChange} 
                                    required 
                                    className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                                />
                                <CheckCircle2 size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Post-nom</label>
                            <input 
                                name="post_name" 
                                value={formData.post_name || ''} 
                                onChange={handleChange} 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Genre</label>
                            <select 
                                name="gender" 
                                value={formData.gender || ''} 
                                onChange={handleChange} 
                                required
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner appearance-none text-sm"
                            >
                                <option value="" disabled>Sélectionner...</option>
                                <option value="M">Masculin</option>
                                <option value="F">Féminin</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Section: Naissance */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Origine & Naissance</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Date de naissance</label>
                            <div className="relative group">
                                <input 
                                    type="date" 
                                    name="birth_date" 
                                    value={formData.birth_date || ''} 
                                    onChange={handleChange} 
                                    className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                                />
                                <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Lieu de naissance</label>
                            <div className="relative group">
                                <input 
                                    name="birthplace" 
                                    value={formData.birthplace || ''} 
                                    onChange={handleChange} 
                                    className="w-full pl-11 pr-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                                />
                                <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Conduite */}
                <div className="space-y-6">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h3 className="text-[11px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Évaluations de Conduite</h3>
                    </div>
                    
                    <div className="bg-slate-50/50 dark:bg-slate-900/30 p-6 rounded-[2rem] border border-slate-100 dark:border-white/5 shadow-inner">
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                            {[
                                { key: 'conduite_p1', label: '1ère Période' },
                                { key: 'conduite_p2', label: '2ème Période' },
                                { key: 'conduite_p3', label: '3ème Période' },
                                { key: 'conduite_p4', label: '4ème Période' },
                            ].map(({ key, label }) => (
                                <div key={key} className="space-y-2">
                                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest px-1">{label}</label>
                                    <select 
                                        name={key} 
                                        value={(formData as any)[key] || ''} 
                                        onChange={handleChange} 
                                        className="w-full px-3 py-3 bg-white dark:bg-slate-800 border border-slate-100 dark:border-white/5 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all shadow-sm"
                                    >
                                        <option value="">--</option>
                                        <option value="elute">Élute</option>
                                        <option value="tres bon">T. Bon</option>
                                        <option value="bon">Bon</option>
                                        <option value="mediocre">Médiocre</option>
                                        <option value="mauvais">Mauvais</option>
                                    </select>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Section: Situation d'Abandon */}
                <div className={`p-8 rounded-[2rem] transition-all duration-500 border ${isAbandoned ? 'bg-red-50/50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' : 'bg-slate-50 dark:bg-slate-900/50 border-slate-100 dark:border-white/5'}`}>
                    <label className="flex items-center gap-4 cursor-pointer group">
                        <div className="relative">
                            <input
                                type="checkbox"
                                checked={isAbandoned ? true : false}
                                onChange={(e) => setFormData(prev => ({ ...prev, is_abandoned: e.target.checked }))}
                                className="sr-only"
                            />
                            <div className={`w-14 h-8 rounded-full transition-all duration-300 shadow-inner ${isAbandoned ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-800'}`}></div>
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 ${isAbandoned ? 'left-7' : 'left-1'}`}></div>
                        </div>
                        <div className="flex-1">
                            <span className={`text-sm font-black uppercase tracking-widest transition-colors ${isAbandoned ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                État : {isAbandoned ? "Abandon d'études" : "Scolarisé"}
                            </span>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Activer si l'élève a quitté l'établissement</p>
                        </div>
                        {isAbandoned && <ShieldAlert className="text-red-500 animate-pulse" size={24} />}
                    </label>

                    {isAbandoned && (
                        <div className="mt-8 space-y-3 animate-in fade-in slide-in-from-top-4">
                            <div className="flex items-center gap-2 px-1">
                                <Info size={14} className="text-red-400" />
                                <label className="text-[10px] font-black text-red-400 uppercase tracking-widest">Motif de l'abandon</label>
                            </div>
                            <textarea
                                name="abandon_reason"
                                value={(formData as any).abandon_reason || ''}
                                onChange={(e) => setFormData(prev => ({ ...prev, abandon_reason: e.target.value }))}
                                className="w-full px-6 py-4 bg-white dark:bg-slate-950/50 border border-red-100 dark:border-red-900/20 rounded-2xl text-red-900 dark:text-red-300 font-medium focus:ring-4 focus:ring-red-500/10 focus:border-red-500 outline-none transition-all shadow-inner"
                                rows={3}
                                placeholder="Précisez la raison de l'abandon..."
                            />
                        </div>
                    )}
                </div>

                {/* Submit Actions */}
                <div className="flex items-center gap-4 pt-4">
                    <button 
                        type="button" 
                        onClick={() => onClose()} 
                        className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
                    >
                        Annuler
                    </button>
                    <button 
                        type="submit" 
                        className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98]"
                    >
                        <Save size={18} />
                        Enregistrer
                    </button>
                </div>
            </form>
        </div>
    );
};