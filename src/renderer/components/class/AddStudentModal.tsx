import React, { useState, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { X, UserPlus, Upload, FileText, Clipboard, Sparkles, Check, ArrowRight, AlertCircle, Table } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { parseDocx, parsePastedText, mapHeaders, parseDate as smartParseDate, parseGender, RawStudent } from '../../lib/importUtils';
import { motion, AnimatePresence } from 'framer-motion';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (student: {
    first_name: string;
    last_name: string;
    post_name: string;
    gender: 'M' | 'F';
    birth_date: string;
    birthplace: string;
    class_id: number;
  }) => Promise<void>;
  onImport: (students: Partial<Student>[]) => Promise<void>;
  classId: number;
  existingStudents: Student[];
}

type ImportStep = 'initial' | 'mapping' | 'preview';

export default function AddStudentModal({ isOpen, onClose, onAdd, onImport, classId, existingStudents }: AddStudentModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [importStep, setImportStep] = useState<ImportStep>('initial');
  const [loading, setLoading] = useState(false);
  const [pastedText, setPastedText] = useState('');
  const [rawRows, setRawRows] = useState<RawStudent[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedStudents, setParsedStudents] = useState<Partial<Student>[]>([]);
  
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetImport = () => {
    setImportStep('initial');
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setParsedStudents([]);
    setPastedText('');
  };

  const handleClose = () => {
    resetImport();
    onClose();
  };

  // React 19 Action for manual submission
  const [state, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    try {
      const studentData = {
        first_name: formData.get('first_name') as string,
        last_name: formData.get('last_name') as string,
        post_name: formData.get('post_name') as string,
        gender: formData.get('gender') as 'M' | 'F',
        birth_date: formData.get('birth_date') as string,
        birthplace: formData.get('birthplace') as string,
        class_id: classId
      };

      await onAdd(studentData);
      toast.success(`Élève ${studentData.first_name} ${studentData.last_name} ajouté avec succès !`);
      handleClose();
      return { success: true };
    } catch (error) {
      console.error('Failed to add student:', error);
      toast.error('Erreur lors de l\'ajout de l\'élève');
      return { success: false, error: 'Failed to add student' };
    }
  }, null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let rows: RawStudent[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as RawStudent[];
      } else if (fileName.endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        rows = await parseDocx(buffer);
      } else {
        toast.error('Format non supporté (.xlsx, .xls, .docx)');
        setLoading(false);
        return;
      }

      if (rows.length === 0) {
        toast.warning('Aucune donnée trouvée.');
        setLoading(false);
        return;
      }

      prepareMapping(rows);
    } catch (error) {
      console.error('File load error:', error);
      toast.error('Erreur lors de la lecture du fichier.');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!pastedText.trim()) return;
    const rows = parsePastedText(pastedText);
    if (rows.length === 0) {
      toast.error('Impossible d\'analyser le texte collé.');
      return;
    }
    prepareMapping(rows);
  };

  const prepareMapping = (rows: RawStudent[]) => {
    const fileHeaders = Object.keys(rows[0]);
    const initialMapping = mapHeaders(fileHeaders);
    setHeaders(fileHeaders);
    setRawRows(rows);
    setMapping(initialMapping);
    setImportStep('mapping');
  };

  const confirmMapping = () => {
    const students = rawRows.map(row => ({
      last_name: row[mapping['last_name']] || '',
      post_name: row[mapping['post_name']] || '',
      first_name: row[mapping['first_name']] || '',
      gender: parseGender(row[mapping['gender']]) as 'M' | 'F',
      birth_date: smartParseDate(row[mapping['birth_date']]) || '',
      birthplace: row[mapping['birthplace']] || '',
      class_id: classId
    }));
    setParsedStudents(students);
    setImportStep('preview');
  };

  const performImport = async () => {
    const validOnes = parsedStudents.filter(s => s.first_name && s.last_name);
    if (validOnes.length === 0) {
      toast.error('Aucun élève valide à importer.');
      return;
    }

    setLoading(true);
    try {
      await onImport(validOnes);
      toast.success(`${validOnes.length} élèves importés avec succès !`);
      handleClose();
    } catch (error) {
      console.error('Final import error:', error);
      toast.error('Erreur lors de l\'importation.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-[#020617] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 w-full max-w-2xl flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-6 relative overflow-hidden shrink-0">
            <div className="absolute top-0 right-0 p-8 text-white/5 rotate-12 transition-transform duration-1000 group-hover:rotate-0">
                <UserPlus size={100} />
            </div>
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="bg-white/20 dark:bg-blue-600/30 p-2.5 rounded-xl backdrop-blur-md">
                        <UserPlus size={24} className="text-white" />
                    </div>
                    <div>
                        <p className="text-blue-100/60 font-black uppercase tracking-widest text-[9px] mb-1">Portail Élèves</p>
                        <h2 className="text-2xl font-black text-white tracking-tight">Ajouter des élèves</h2>
                    </div>
                </div>
                <button onClick={handleClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><X size={20} /></button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-1.5 mx-8 mt-6 rounded-2xl border border-slate-100 dark:border-white/5 shrink-0">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <UserPlus size={14} /> Saisie Manuelle
          </button>
          <button
            onClick={() => { setActiveTab('import'); resetImport(); }}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all ${activeTab === 'import' ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-500/10' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Sparkles size={14} /> Smart Import (Word/Excel)
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 pt-4 custom-scrollbar">
          {activeTab === 'manual' ? (
            <form action={formAction} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Nom</label>
                        <input name="last_name" required className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Post-nom</label>
                        <input name="post_name" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Prénom</label>
                        <input name="first_name" required className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Genre</label>
                        <select name="gender" required className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all appearance-none">
                            <option value="M">Masculin</option>
                            <option value="F">Féminin</option>
                        </select>
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Date de naissance</label>
                        <input name="birth_date" type="date" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-1">Lieu de naissance</label>
                        <input name="birthplace" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-sm font-bold outline-none focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 transition-all" />
                    </div>
                </div>
                <div className="flex gap-3 pt-2">
                    <button type="button" onClick={handleClose} className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-500 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 transition-all">Annuler</button>
                    <SubmitButton label="Ajouter" loadingLabel="Ajout..." />
                </div>
            </form>
          ) : (
            <div className="space-y-6">
                <AnimatePresence mode="wait">
                    {importStep === 'initial' && (
                        <motion.div key="initial" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-6">
                            <div 
                                onClick={() => fileInputRef.current?.click()}
                                className="border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] p-10 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-50/30 transition-all group"
                            >
                                <input type="file" ref={fileInputRef} className="hidden" accept=".xlsx,.xls,.docx" onChange={handleFileUpload} />
                                <Upload className="mx-auto text-slate-300 group-hover:text-blue-500 transition-colors mb-4" size={48} />
                                <p className="font-black text-slate-800 dark:text-white">Déposer un fichier Word ou Excel</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">.docx, .xlsx, .xls</p>
                            </div>
                            <div className="relative">
                                <textarea 
                                    value={pastedText}
                                    onChange={(e) => setPastedText(e.target.value)}
                                    placeholder="OU Collez vos données ici (tableau copié)..."
                                    className="w-full h-32 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-2xl p-4 text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/10 transition-all"
                                />
                                {pastedText.trim() && (
                                    <button onClick={handlePaste} className="absolute bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-xl font-black uppercase text-[9px] shadow-lg shadow-blue-500/30">Analyser</button>
                                )}
                            </div>
                        </motion.div>
                    )}

                    {importStep === 'mapping' && (
                        <motion.div key="mapping" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex items-center gap-3">
                                <Sparkles className="text-blue-600" size={18} />
                                <p className="text-[10px] font-black text-blue-800 dark:text-blue-300 uppercase tracking-widest">Vérifiez les colonnes correspondantes</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {Object.keys(mapping).map(field => (
                                    <div key={field} className="space-y-1.5">
                                        <label className="text-[9px] font-black text-slate-400 uppercase px-1">{field}</label>
                                        <select 
                                            value={mapping[field]} 
                                            onChange={(e) => setMapping({...mapping, [field]: e.target.value})}
                                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl font-bold text-xs outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            <option value="">Ignorer</option>
                                            {headers.map(h => <option key={h} value={h}>{h}</option>)}
                                        </select>
                                    </div>
                                ))}
                            </div>
                            <button onClick={confirmMapping} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20">Suivant</button>
                        </motion.div>
                    )}

                    {importStep === 'preview' && (
                        <motion.div key="preview" initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="space-y-6">
                            <div className="border border-slate-100 dark:border-white/5 rounded-2xl overflow-hidden max-h-64 overflow-y-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 dark:bg-slate-900 sticky top-0">
                                        <tr className="text-[9px] font-black uppercase text-slate-400 border-b border-slate-100 dark:border-white/5">
                                            <th className="px-4 py-2">Nom Complet</th>
                                            <th className="px-4 py-2">Prénom</th>
                                            <th className="px-4 py-2">Sexe</th>
                                            <th className="px-4 py-2">Statut</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-white/5">
                                        {parsedStudents.map((s, i) => (
                                            <tr key={i} className="text-xs font-bold">
                                                <td className="px-4 py-3 text-slate-900 dark:text-white">{s.last_name} {s.post_name}</td>
                                                <td className="px-4 py-3 text-slate-500">{s.first_name}</td>
                                                <td className="px-4 py-3 text-slate-500">{s.gender}</td>
                                                <td className="px-4 py-3">{s.last_name && s.first_name ? <Check size={14} className="text-green-500" /> : <AlertCircle size={14} className="text-red-500" />}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="flex gap-3">
                                <button onClick={() => setImportStep('initial')} className="flex-1 px-6 py-4 rounded-xl border border-slate-200 text-slate-500 font-black uppercase text-[9px]">Modifier</button>
                                <button onClick={performImport} disabled={loading} className="flex-[2] bg-blue-600 text-white px-6 py-4 rounded-xl font-black uppercase text-[9px] shadow-xl shadow-blue-500/20 disabled:opacity-50">
                                    {loading ? 'Importation...' : `Importer ${parsedStudents.length} élèves`}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {pending && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {pending ? loadingLabel : label}
    </button>
  );
}
