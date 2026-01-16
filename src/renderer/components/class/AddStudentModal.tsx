import React, { useState, useActionState, useRef } from 'react';
import { useFormStatus } from 'react-dom';
import { X, UserPlus, Upload, FileText, Clipboard, Sparkles, Check, ArrowRight, AlertCircle, Table } from 'lucide-react';
import { Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';
import { parseDocx, parsePastedText, mapHeaders, parseDate as smartParseDate, parseGender, RawStudent } from '../../lib/importUtils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAddStudent: (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => Promise<boolean>;
  onImportStudents: (students: Omit<Student, 'id' | 'created_at' | 'updated_at'>[]) => Promise<boolean>;
  classId: number;
}

function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button 
      type="submit" 
      disabled={pending}
      className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-500/20 hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-50"
    >
      {pending ? loadingLabel : label}
    </button>
  );
}

export default function AddStudentModal({ isOpen, onClose, onAddStudent, onImportStudents, classId }: AddStudentModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const [importStep, setImportStep] = useState<'initial' | 'mapping' | 'preview'>('initial');
  const [pastedText, setPastedText] = useState('');
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawData, setRawData] = useState<RawStudent[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [parsedStudents, setParsedStudents] = useState<Omit<Student, 'id' | 'created_at' | 'updated_at'>[]>([]);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  const [error, formAction] = useActionState(async (prevState: any, formData: FormData) => {
    const student = {
      last_name: formData.get('last_name') as string,
      post_name: formData.get('post_name') as string,
      first_name: formData.get('first_name') as string,
      gender: formData.get('gender') as string,
      birth_date: formData.get('birth_date') as string || undefined,
      birthplace: formData.get('birthplace') as string || undefined,
      class_id: classId,
    } as Omit<Student, 'id' | 'created_at' | 'updated_at'>;

    const success = await onAddStudent(student);
    if (success) {
      toast.success('Élève ajouté avec succès');
      onClose();
    }
    return null;
  }, null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      let rows: RawStudent[] = [];
      const fileName = file.name.toLowerCase();

      if (fileName.endsWith('.csv')) {
        const text = await file.text();
        const lines = text.split('\n').filter(l => l.trim());
        if (lines.length > 0) {
          const rawHeaders = lines[0].split(',').map(h => h.trim().replace(/^["']|["']$/g, ''));
          rows = lines.slice(1).map(line => {
            const values = line.split(',').map(v => v.trim().replace(/^["']|["']$/g, ''));
            const obj: RawStudent = {};
            rawHeaders.forEach((h, i) => {
              obj[h] = values[i] || '';
            });
            return obj;
          });
        }
      } else if (fileName.endsWith('.docx')) {
        const buffer = await file.arrayBuffer();
        rows = await parseDocx(buffer);
      } else {
        toast.error('Format non supporté (.csv, .docx)');
        setLoading(false);
        return;
      }

      if (rows.length > 0) {
        processRawData(rows);
      } else {
        toast.error('Aucune donnée trouvée dans le fichier');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erreur lors de la lecture du fichier');
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = () => {
    if (!pastedText.trim()) return;
    const rows = parsePastedText(pastedText);
    if (rows.length > 0) {
      processRawData(rows);
    } else {
      toast.error('Format de texte non reconnu');
    }
  };

  const processRawData = (data: RawStudent[]) => {
    const detectedHeaders = Object.keys(data[0]);
    setHeaders(detectedHeaders);
    setRawData(data);
    setMapping(mapHeaders(detectedHeaders));
    setImportStep('mapping');
  };

  const confirmMapping = () => {
    const students = rawData.map(row => ({
      last_name: row[mapping['last_name']] || '',
      post_name: row[mapping['post_name']] || '',
      first_name: row[mapping['first_name']] || '',
      gender: parseGender(row[mapping['gender']]),
      birth_date: smartParseDate(row[mapping['birth_date']]),
      birthplace: row[mapping['birthplace']] || '',
      class_id: classId,
    }));
    setParsedStudents(students);
    setImportStep('preview');
  };

  const performImport = async () => {
    setLoading(true);
    const success = await onImportStudents(parsedStudents);
    if (success) {
      toast.success(`${parsedStudents.length} élèves importés`);
      onClose();
    }
    setLoading(false);
  };

  const handleClose = () => {
    setImportStep('initial');
    setPastedText('');
    setActiveTab('manual');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto animate-in fade-in duration-300">
      <div 
        className="bg-white dark:bg-[#020617] rounded-[2.5rem] overflow-hidden shadow-2xl border border-slate-200 dark:border-white/5 w-full max-w-2xl flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300"
      >
        {/* Header */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-6 relative overflow-hidden shrink-0">
          <div className="relative z-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <UserPlus size={24} className="text-white" />
              </div>
              <div>
                <p className="text-blue-100/60 font-black uppercase tracking-widest text-[9px] mb-1">Gestion des élèves</p>
                <h2 className="text-2xl font-black text-white tracking-tight">Ajouter des élèves</h2>
              </div>
            </div>
            <button onClick={handleClose} className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all"><X size={20} /></button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-900/50 p-2 gap-2 border-b border-slate-100 dark:border-white/5 shrink-0">
          <button 
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'manual' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <FileText size={14} /> Saisie manuelle
          </button>
          <button 
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'import' ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Table size={14} /> Import groupé
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
                {importStep === 'initial' && (
                    <div key="initial" className="space-y-6 animate-in fade-in duration-300">
                        <div 
                            onClick={() => fileInputRef.current?.click()}
                            className="border-4 border-dashed border-slate-100 dark:border-white/5 rounded-[2rem] p-10 text-center cursor-pointer hover:border-blue-500/50 hover:bg-blue-50/30 transition-all group"
                        >
                            <input type="file" ref={fileInputRef} className="hidden" accept=".csv,.docx" onChange={handleFileUpload} />
                            <Upload className="mx-auto text-slate-300 group-hover:text-blue-500 transition-colors mb-4" size={48} />
                            <p className="font-black text-slate-800 dark:text-white">Déposer un fichier CSV ou Word</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">.csv, .docx</p>
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
                    </div>
                )}

                {importStep === 'mapping' && (
                    <div key="mapping" className="space-y-6 animate-in slide-in-from-right-4 duration-300">
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
                    </div>
                )}

                {importStep === 'preview' && (
                    <div key="preview" className="space-y-6 animate-in zoom-in-95 duration-300">
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
                    </div>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
