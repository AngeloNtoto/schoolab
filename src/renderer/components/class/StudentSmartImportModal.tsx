import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Clipboard, Check, AlertCircle, ArrowRight, Table, Sparkles } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { Student } from '../../services/studentService';
import { parseDocx, parsePastedText, mapHeaders, parseDate, parseGender, RawStudent } from '../../lib/importUtils';

interface StudentSmartImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (students: Partial<Student>[]) => Promise<void>;
  classId: number;
}

type ImportStep = 'initial' | 'mapping' | 'preview' | 'importing';

export default function StudentSmartImportModal({ isOpen, onClose, onImport, classId }: StudentSmartImportModalProps) {
  const [step, setStep] = useState<ImportStep>('initial');
  const [loading, setLoading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [rawRows, setRawRows] = useState<RawStudent[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedStudents, setParsedStudents] = useState<Partial<Student>[]>([]);
  
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStep('initial');
    setLoading(false);
    setPastedText('');
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setParsedStudents([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const processRows = (rows: RawStudent[], currentMapping: Record<string, string>) => {
    const students = rows.map(row => {
      const student: Partial<Student> = {
        last_name: row[currentMapping['last_name']] || '',
        post_name: row[currentMapping['post_name']] || '',
        first_name: row[currentMapping['first_name']] || '',
        gender: parseGender(row[currentMapping['gender']]),
        birth_date: parseDate(row[currentMapping['birth_date']]),
        birthplace: row[currentMapping['birthplace']] || '',
        class_id: classId
      };
      return student;
    });
    setParsedStudents(students);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let rows: RawStudent[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        rows = await parseDocx(buffer);
      } else {
        toast.error('Format de fichier non supporté. Utilisez .docx uniquement');
        setLoading(false);
        return;
      }

      if (rows.length === 0) {
        toast.warning('Aucune donnée trouvée dans le fichier.');
        setLoading(false);
        return;
      }

      const fileHeaders = Object.keys(rows[0]);
      const initialMapping = mapHeaders(fileHeaders);
      
      setHeaders(fileHeaders);
      setRawRows(rows);
      setMapping(initialMapping);
      setStep('mapping');
    } catch (error) {
      console.error('Import error:', error);
      toast.error('Erreur lors de la lecture du fichier.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!pastedText.trim()) {
      toast.error('Veuillez coller du texte d\'abord.');
      return;
    }

    const rows = parsePastedText(pastedText);
    if (rows.length === 0) {
      toast.error('Impossible de détecter le format des données. Assurez-vous d\'avoir des en-têtes et des données tabulaires.');
      return;
    }

    const textHeaders = Object.keys(rows[0]);
    const initialMapping = mapHeaders(textHeaders);

    setHeaders(textHeaders);
    setRawRows(rows);
    setMapping(initialMapping);
    setStep('mapping');
  };

  const handleConfirmMapping = () => {
    processRows(rawRows, mapping);
    setStep('preview');
  };

  const handleFinalImport = async () => {
    const validStudents = parsedStudents.filter(s => s.first_name && s.last_name);
    if (validStudents.length === 0) {
      toast.error('Aucun élève valide à importer.');
      return;
    }

    setLoading(true);
    setStep('importing');
    try {
      await onImport(validStudents);
      toast.success(`${validStudents.length} élèves importés avec succès !`);
      handleClose();
    } catch (error) {
      console.error('Final import error:', error);
      toast.error('Erreur lors de l\'importation finale.');
      setStep('preview');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl flex items-center justify-center z-[200] p-4 animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-[#020617] rounded-[3rem] overflow-hidden shadow-[0_32px_128px_rgba(0,0,0,0.5)] border border-slate-200 dark:border-white/5 w-full max-w-4xl h-[85vh] flex flex-col relative animate-in zoom-in-95 duration-300"
      >
        {/* Close Button */}
        <button 
          onClick={handleClose}
          className="absolute top-8 right-8 p-3 bg-slate-100 hover:bg-red-50 dark:bg-white/5 dark:hover:bg-red-500/20 text-slate-400 hover:text-red-500 rounded-2xl transition-all active:scale-95 z-50"
        >
          <X size={20} />
        </button>

        {/* Header */}
        <div className="bg-gradient-to-br from-blue-600 via-indigo-700 to-indigo-900 p-12 text-white relative transition-all duration-700">
            <div className="absolute top-0 right-0 p-12 text-white/5 rotate-12 scale-150 pointer-events-none">
                <Sparkles size={180} />
            </div>
            
            <div className="relative z-10">
                <div className="flex items-center gap-6 mb-4">
                    <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl shadow-2xl border border-white/20">
                        <Upload size={32} />
                    </div>
                    <div>
                        <p className="text-blue-200 font-black uppercase tracking-[0.3em] text-[10px] mb-2">Import Intelligent v2</p>
                        <h2 className="text-4xl font-black tracking-tighter">
                            Importer des <span className="text-blue-300">Élèves</span>
                        </h2>
                    </div>
                </div>
            </div>

            {/* Step Breadcrumbs */}
            <div className="flex items-center gap-4 mt-8 relative z-10">
                {[
                    { id: 'initial', label: 'Sélection', icon: Upload },
                    { id: 'mapping', label: 'Colonnes', icon: Table },
                    { id: 'preview', label: 'Aperçu', icon: FileText },
                ].map((s, idx) => {
                    const isActive = step === s.id;
                    const isDone = ['mapping', 'preview', 'importing'].slice(idx).includes(step) && step !== s.id;
                    
                    return (
                        <React.Fragment key={s.id}>
                            <div className={`flex items-center gap-2 transition-all duration-500 ${isActive ? 'scale-110' : 'opacity-40'}`}>
                                <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${isActive || isDone ? 'bg-white text-blue-600' : 'bg-white/20 text-white border border-white/20'}`}>
                                    {isDone ? <Check size={14} /> : idx + 1}
                                </div>
                                <span className="font-black uppercase tracking-widest text-[9px]">{s.label}</span>
                            </div>
                            {idx < 2 && <div className="w-8 h-px bg-white/20"></div>}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-12 custom-scrollbar">
            {step === 'initial' && (
                <div 
                    className="grid grid-cols-1 md:grid-cols-2 gap-10 animate-in fade-in duration-300"
                >
                    {/* File Upload */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-3">
                            <div className="w-2 h-8 bg-blue-600 rounded-full"></div>
                            Fichiers Supportés
                        </h3>
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="group cursor-pointer border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[3rem] p-12 text-center transition-all hover:border-blue-500/50 hover:bg-blue-50/50 dark:hover:bg-blue-600/5 relative overflow-hidden"
                        >
                            <input 
                                type="file" 
                                ref={fileInputRef} 
                                className="hidden" 
                                accept=".docx" 
                                onChange={handleFileUpload}
                            />
                            <div className="relative z-10 space-y-4">
                                <div className="bg-white dark:bg-slate-900 w-24 h-24 mx-auto rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform duration-500">
                                    <FileText size={32} className="text-blue-600" />
                                </div>
                                <div>
                                    <p className="font-black text-lg text-slate-800 dark:text-slate-200">Word Document Only</p>
                                    <p className="text-xs text-slate-400 font-medium">Déposez votre fichier .docx ici</p>
                                </div>
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {['.docx'].map(ext => (
                                <span key={ext} className="px-3 py-1 bg-slate-100 dark:bg-white/5 text-slate-500 rounded-lg text-[10px] font-black uppercase tracking-widest">{ext} uniquement</span>
                            ))}
                        </div>
                    </div>

                    {/* Paste Logic */}
                    <div className="space-y-6">
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 flex items-center gap-3">
                            <div className="w-2 h-8 bg-indigo-600 rounded-full"></div>
                            Copier-Coller Direct
                        </h3>
                        <div className="relative group">
                            <div className="absolute top-4 right-4 text-slate-300 group-hover:text-indigo-500 transition-colors">
                                <Clipboard size={24} />
                            </div>
                            <textarea 
                                value={pastedText}
                                onChange={(e) => setPastedText(e.target.value)}
                                placeholder="Collez ici les données copiées de votre tableau Word..."
                                className="w-full h-64 bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-white/5 rounded-[2.5rem] p-8 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-8 focus:ring-indigo-500/10 transition-all shadow-inner"
                            />
                        </div>
                        <button 
                            onClick={handlePaste}
                            disabled={!pastedText.trim()}
                            className="w-full bg-slate-900 dark:bg-indigo-600 hover:bg-black dark:hover:bg-indigo-700 text-white py-5 rounded-2xl font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 disabled:opacity-50"
                        >
                            Analyser le texte
                        </button>
                    </div>
                </div>
            )}

            {step === 'mapping' && (
                <div 
                    className="space-y-10 animate-in slide-in-from-right-4 duration-300"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Configuration des Colonnes</h3>
                        <button 
                            onClick={() => setStep('initial')}
                            className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest"
                        >
                            Recommencer
                        </button>
                    </div>

                    <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-500/20 p-6 rounded-[2rem] flex items-start gap-4">
                        <Sparkles className="text-blue-600 shrink-0" size={24} />
                        <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">
                            Nous avons automatiquement détecté vos colonnes. Vérifiez les correspondances avant de continuer.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {[
                            { id: 'last_name', label: 'Nom', required: true },
                            { id: 'post_name', label: 'Post-Nom', required: false },
                            { id: 'first_name', label: 'Prénom', required: true },
                            { id: 'gender', label: 'Genre (M/F)', required: true },
                            { id: 'birth_date', label: 'Date de naissance', required: false },
                            { id: 'birthplace', label: 'Lieu de naissance', required: false },
                        ].map(field => (
                            <div key={field.id} className="space-y-3 group border-b border-slate-100 dark:border-white/5 pb-6">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest px-1">
                                        {field.label} {field.required && <span className="text-red-500">*</span>}
                                    </label>
                                    {!mapping[field.id] && field.required && (
                                        <span className="text-[9px] bg-red-50 text-red-500 px-2 py-0.5 rounded-full font-black uppercase">Manquant</span>
                                    )}
                                </div>
                                <select 
                                    value={mapping[field.id] || ''}
                                    onChange={(e) => setMapping({...mapping, [field.id]: e.target.value})}
                                    className="w-full px-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-2xl font-black text-sm text-slate-700 dark:text-white outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all shadow-xl shadow-slate-200/20 dark:shadow-none"
                                >
                                    <option value="">-- Ignorer --</option>
                                    {headers.map(h => (
                                        <option key={h} value={h}>{h}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>

                    <button 
                        onClick={handleConfirmMapping}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white py-6 rounded-3xl font-black uppercase tracking-widest text-lg shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-4 transition-all active:scale-95 mt-10"
                    >
                        Voir l'aperçu
                        <ArrowRight size={20} />
                    </button>
                </div>
            )}

            {step === 'preview' && (
                <div 
                    className="space-y-10 animate-in zoom-in-95 duration-300"
                >
                    <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">Aperçu Avant Importation</h3>
                        <button 
                            onClick={() => setStep('mapping')}
                            className="text-xs font-black text-slate-400 hover:text-blue-600 uppercase tracking-widest"
                        >
                            Ajuster les colonnes
                        </button>
                    </div>

                    <div className="border border-slate-200 dark:border-white/5 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-900/20 max-h-[400px] overflow-y-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse">
                            <thead className="sticky top-0 z-10 bg-slate-50 dark:bg-slate-900">
                                <tr className="text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-200 dark:border-white/5">
                                    <th className="px-8 py-4">Nom Complet</th>
                                    <th className="px-8 py-4">Genre</th>
                                    <th className="px-8 py-4">Naissance</th>
                                    <th className="px-8 py-4">Lieu</th>
                                    <th className="px-8 py-4">Statut</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-white/5">
                                {parsedStudents.map((s, i) => {
                                    const isValid = s.first_name && s.last_name;
                                    return (
                                        <tr key={i} className="group hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors">
                                            <td className="px-8 py-5">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-600/20 text-blue-600 rounded-full flex items-center justify-center font-black text-xs">
                                                        {s.last_name?.[0]}{s.first_name?.[0]}
                                                    </div>
                                                    <span className="font-bold text-slate-900 dark:text-white">
                                                        {s.last_name} {s.post_name} {s.first_name}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className={`px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${s.gender === 'M' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                                                    {s.gender === 'M' ? 'Masculin' : 'Féminin'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
                                                    {s.birth_date ? new Date(s.birth_date).toLocaleDateString() : '-'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                <span className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate max-w-[120px] block">
                                                    {s.birthplace || '-'}
                                                </span>
                                            </td>
                                            <td className="px-8 py-5">
                                                {isValid ? (
                                                    <Check className="text-green-500" size={18} />
                                                ) : (
                                                    <div className="flex items-center gap-2 text-red-500" title="Informations incomplètes">
                                                        <AlertCircle size={18} />
                                                        <span className="text-[10px] font-black uppercase">Invalide</span>
                                                    </div>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="text-center md:text-left">
                            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] mb-1">Résumé de l'importation</p>
                            <p className="text-2xl font-black text-slate-800 dark:text-white">
                                <span className="text-blue-600">{parsedStudents.filter(s => s.first_name && s.last_name).length}</span> élèves prêts à être ajoutés
                            </p>
                        </div>
                        <button 
                            onClick={handleFinalImport}
                            disabled={loading}
                            className="px-12 py-5 bg-blue-600 hover:bg-blue-700 text-white rounded-3xl font-black uppercase tracking-widest text-lg shadow-2xl shadow-blue-500/30 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Importation...' : 'Confirmer l\'Import'}
                        </button>
                    </div>
                </div>
            )}

            {step === 'importing' && (
                <div 
                    className="py-24 text-center space-y-8 animate-in zoom-in-95 duration-300"
                >
                    <div className="relative inline-block">
                        <div className="w-24 h-24 border-8 border-slate-100 dark:border-white/5 border-t-blue-600 rounded-full animate-spin"></div>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Sparkles className="text-blue-600 animate-pulse" size={32} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-3xl font-black text-slate-800 dark:text-white tracking-tighter mb-2">Finalisation de l'Import</h3>
                        <p className="text-slate-500 dark:text-slate-500 font-medium">Insertion des élèves dans la base de données de l'école...</p>
                    </div>
                </div>
            )}
        </div>
      </div>
    </div>
  );
}
