import React, { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { X, UserPlus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../../services/studentService';
import { useToast } from '../../context/ToastContext';

/**
 * INTERFACE DU MODAL D'AJOUT D'ÉLÈVES
 * 
 * Ce modal gère deux modes d'ajout :
 * 1. Manuel : formulaire pour un élève
 * 2. Import : fichier Excel pour plusieurs élèves
 */
interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  
  /**
   * Fonction pour ajouter UN élève manuellement.
   * Cette fonction vient du hook useStudents.addStudent qui délègue au service.
   * 
   * IMPORTANT : class_id est REQUIS car :
   * - La table students a une contrainte NOT NULL sur class_id
   * - Chaque élève doit être associé à une classe
   * - Le modal reçoit classId en props et doit le passer ici
   */
  onAdd: (student: {
    first_name: string;
    last_name: string;
    post_name: string;
    gender: 'M' | 'F';
    birth_date: string;
    birthplace: string;
    class_id: number;  // ✅ Ajouté : requis pour l'insertion en BDD
  }) => Promise<void>;
  
  /**
   * Fonction pour importer PLUSIEURS élèves depuis Excel.
   * Cette fonction vient du hook useStudents.importStudents.
   * 
   * NOTE : class_id n'est PAS dans cette interface car :
   * - Le hook useStudents.importStudents ajoute automatiquement le class_id
   * - Cela évite de dupliquer class_id pour chaque élève dans le fichier Excel
   */
  onImport: (students: Array<{
    first_name: string;
    last_name: string;
    post_name: string;
    gender: 'M' | 'F';
    birth_date: string;
    birthplace: string;
  }>) => Promise<void>;
  
  classId: number;  // ID de la classe courante (passé aux fonctions ci-dessus)
  existingStudents: Student[]; // Liste des élèves existants pour vérification des doublons
}

export default function AddStudentModal({ isOpen, onClose, onAdd, onImport, classId, existingStudents }: AddStudentModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  const toast = useToast();
  
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
      onClose();
      return { success: true };
    } catch (error) {
      console.error('Failed to add student:', error);
      toast.error('Erreur lors de l\'ajout de l\'élève');
      return { success: false, error: 'Failed to add student' };
    }
  }, null);

  const [loading, setLoading] = useState(false);

const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  setLoading(true);

  // --- Helpers locaux ---
  const normalize = (s: any) =>
    String(s ?? '')
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '') // remove accents
      .replace(/[^a-z0-9]/gi, ' ')
      .trim()
      .toLowerCase();

  const mapGender = (raw: any): 'M' | 'F' => {
    if (!raw) return 'M';
    const g = normalize(raw);
    if (['m', 'male', 'masculin', 'homme', 'garcon', 'garçon', 'h'].includes(g)) return 'M';
    if (['f', 'female', 'feminin', 'femme', 'fille'].includes(g)) return 'F';
    // fallback heuristic: first letter
    const first = String(raw).trim()[0]?.toLowerCase();
    return first === 'f' ? 'F' : 'M';
  };

  const parseDate = (raw: any): string => {
    // returns ISO yyyy-mm-dd or empty string
    if (!raw) return '';
    const s = String(raw).trim();

    // If already ISO-like yyyy-mm-dd
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

    // dd/mm/yyyy or d/m/yyyy
    if (/^\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}$/.test(s)) {
      const parts = s.split(/[/\-]/).map(p => p.padStart(2, '0'));
      // if format looks like dd/mm/yyyy
      let [a, b, c] = parts;
      // if c length === 2 assume 20xx
      if (c.length === 2) c = '20' + c;
      // Heuristic: if a > 31, probably yyyy-mm-dd already handled above, else a is day
      const day = a.padStart(2, '0');
      const month = b.padStart(2, '0');
      const year = c;
      return `${year}-${month}-${day}`;
    }

    // Excel serial numbers (sometimes come as numbers)
    if (!isNaN(Number(s))) {
      try {
        const d = XLSX.SSF.parse_date_code(Number(s));
        if (d && d.y) {
          const mm = String(d.m).padStart(2, '0');
          const dd = String(d.d).padStart(2, '0');
          return `${d.y}-${mm}-${dd}`;
        }
      } catch { /* ignore */ }
    }

    // Fallback: try Date.parse
    const dt = new Date(s);
    if (!isNaN(dt.getTime())) {
      const iso = dt.toISOString().slice(0, 10);
      return iso;
    }

    return '';
  };

  const splitNomPostnom = (raw: string) => {
    // raw may be "Nom Postnom" or "Nom, Postnom" or "Nom / Postnom"
    if (!raw) return { last_name: '', post_name: '' };
    const s = String(raw).trim();
    // if comma present, split on comma
    if (s.includes(',')) {
      const [last, ...rest] = s.split(',');
      return { last_name: last.trim(), post_name: rest.join(',').trim() };
    }
    // if slash or dash
    if (/[\/\-|]/.test(s)) {
      const parts = s.split(/[\/\-\|]/).map(p => p.trim()).filter(Boolean);
      return { last_name: parts[0] || '', post_name: (parts[1] || '') };
    }
    // else split by whitespace: first token = last_name, rest = post_name
    const tokens = s.split(/\s+/).filter(Boolean);
    if (tokens.length === 1) return { last_name: tokens[0], post_name: '' };
    const last = tokens[0];
    const post = tokens.slice(1).join(' ');
    return { last_name: last, post_name: post };
  };

  try {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    // use defval to ensure keys exist (not undefined)
    const rawJson = XLSX.utils.sheet_to_json(worksheet, { defval: '' }) as Array<Record<string, any>>;

    if (!rawJson || rawJson.length === 0) {
      toast.warning('Le fichier est vide ou mal formaté.');
      setLoading(false);
      return;
    }

    // --- Détection et normalisation des en-têtes ---
    const headers = Object.keys(rawJson[0]).map(h => ({ raw: h, norm: normalize(h) }));
    // mapping heuristique : map normalized header to canonical field names
    const headerToField: Record<string, string> = {};
    const headerAliases: Record<string, string[]> = {
      last_name: ['nom', 'nom de famille', 'surname', 'lastname', 'nompostnom', 'nom et postnom', 'nom et post-nom'],
      post_name: ['post-nom', 'postnom', 'post name', 'post_name'],
      first_name: ['prenom', 'prénom', 'first name', 'firstname'],
      gender: ['sexe', 'gender', 'genre', 'sex'],
      birth_date: ['date de naissance', 'birth date', 'birthday', 'dob'],
      birthplace: ['lieu de naissance', 'birthplace', 'place of birth'],
      // also accept combined
      name_combined: ['nom et postnom', 'nompostnom', 'nom postnom', 'name', 'full name', 'nom complet']
    };

    // Build reverse lookup
    for (const { raw, norm } of headers) {
      let assigned = false;
      for (const [field, aliases] of Object.entries(headerAliases)) {
        for (const a of aliases) {
          if (norm.includes(normalize(a))) {
            headerToField[raw] = field;
            assigned = true;
            break;
          }
        }
        if (assigned) break;
      }
      if (!assigned) {
        // fallback heuristics
        if (norm.includes('nom') && norm.includes('post')) headerToField[raw] = 'name_combined';
        else if (norm.includes('nom') && !headerToField[raw]) headerToField[raw] = 'last_name';
        else if (norm.includes('prenom') || norm.includes('first')) headerToField[raw] = 'first_name';
        else headerToField[raw] = 'unknown';
      }
    }

    // --- Convert rows to students with flexible parsing ---
    const parsedRows: Array<{ rowIndex: number; student?: any; errors?: string[] }> = [];

    rawJson.forEach((row, idx) => {
      const errors: string[] = [];
      const out: any = {};

      // For each raw column, map to canonical field if known
      for (const rawKey of Object.keys(row)) {
        const field = headerToField[rawKey] ?? 'unknown';
        const value = row[rawKey];
        if (field === 'unknown') continue;
        if (field === 'name_combined') {
          const { last_name, post_name } = splitNomPostnom(value);
          if (last_name) out.last_name = out.last_name || last_name;
          if (post_name) out.post_name = out.post_name || post_name;
        } else {
          out[field] = out[field] || value;
        }
      }

      // If last_name is missing but there's a column like "Nom et PostNom" not detected, try common fallback keys
      if (!out.last_name) {
        // try fields with common raw headers
        const possible = ['nom', 'name', 'full name', 'nom et postnom', 'nompostnom'];
        for (const rawKey of Object.keys(row)) {
          const n = normalize(rawKey);
          if (possible.some(p => n.includes(normalize(p)))) {
            const { last_name, post_name } = splitNomPostnom(row[rawKey]);
            out.last_name = last_name || out.last_name;
            out.post_name = post_name || out.post_name;
            break;
          }
        }
      }

      // If post_name absent, ensure it's at least ''
      out.post_name = out.post_name || '';

      // Gender normalization
      out.gender = mapGender(out.gender || out.genre || '');

      // first name normalization (try columns with 'prenom' or 'first')
      if (!out.first_name) {
        for (const rawKey of Object.keys(row)) {
          const n = normalize(rawKey);
          if (n.includes('prenom') || n.includes('first')) {
            out.first_name = row[rawKey];
            break;
          }
        }
      }
      out.first_name = (out.first_name || '').toString().trim();

      // birth_date parsing
      out.birth_date = parseDate(out.birth_date || row['Date de naissance'] || row['date'] || '');

      // birthplace
      out.birthplace = (out.birthplace || '').toString().trim();

      // Basic validations
      if (!out.last_name) errors.push('Nom manquant');
      if (!out.first_name) errors.push('Prénom manquant');
      if (!['M', 'F'].includes(out.gender)) errors.push('Genre invalide');

      parsedRows.push({
        rowIndex: idx + 2, // +2 because sheet header row + 1-based index
        student: errors.length === 0 ? {
          first_name: out.first_name,
          last_name: out.last_name,
          post_name: out.post_name,
          gender: out.gender,
          birth_date: out.birth_date,
          birthplace: out.birthplace
        } : undefined,
        errors: errors.length ? errors : undefined
      });
    });

    // --- Separate valid / invalid rows ---
    const validRows = parsedRows.filter(r => r.student);
    const invalidRows = parsedRows.filter(r => r.errors);

    // Deduplicate: compare normalized triple (first,last,post)
    const normalizeKey = (s: any) =>
      `${(s.first_name || '').toString().trim().toLowerCase()}|${(s.last_name || '').toString().trim().toLowerCase()}|${(s.post_name || '').toString().trim().toLowerCase()}`;

    const existingSet = new Set(
      existingStudents.map(ex => normalizeKey({
        first_name: ex.first_name,
        last_name: ex.last_name,
        post_name: ex.post_name
      }))
    );

    const seenInFile = new Set<string>();
    const toImport: any[] = [];
    const dupExisting: any[] = [];
    const dupInFile: any[] = [];

    for (const r of validRows) {
      const key = normalizeKey(r.student);
      if (existingSet.has(key)) {
        dupExisting.push(r.student);
      } else if (seenInFile.has(key)) {
        dupInFile.push(r.student);
      } else {
        seenInFile.add(key);
        toImport.push(r.student);
      }
    }

    // Provide a summary and handle import
    if (toImport.length === 0) {
      let msg = 'Aucun nouvel élève à importer.';
      if (dupExisting.length > 0) msg += ` ${dupExisting.length} doublon(s) existant(s) ignoré(s).`;
      if (dupInFile.length > 0) msg += ` ${dupInFile.length} doublon(s) dans le fichier ignoré(s).`;
      if (invalidRows.length > 0) msg += ` ${invalidRows.length} ligne(s) invalides.`;
      toast.warning(msg);
      setLoading(false);

      // Optionally show first invalid lines in console for debugging
      if (invalidRows.length > 0) {
        console.warn('Lignes invalides:', invalidRows.slice(0, 10));
      }
      return;
    }

    // Call onImport with sanitized students (onImport adds classId internally)
    await onImport(toImport);

    // Toast summary
    let successMsg = `${toImport.length} élève(s) importé(s) avec succès.`;
    if (dupExisting.length > 0) successMsg += ` ${dupExisting.length} doublon(s) existant(s) ignoré(s).`;
    if (dupInFile.length > 0) successMsg += ` ${dupInFile.length} doublon(s) dans le fichier ignoré(s).`;
    if (invalidRows.length > 0) successMsg += ` ${invalidRows.length} ligne(s) invalides.`;
    toast.success(successMsg);

    // Option: log invalid rows for developer
    if (invalidRows.length > 0) console.warn('Invalid rows examples:', invalidRows.slice(0, 10));

    // Close modal
    onClose();

  } catch (error) {
    console.error('Failed to import students:', error);
    toast.error('Erreur lors de l\'importation du fichier Excel');
  } finally {
    setLoading(false);
  }
};


  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 overflow-y-auto">
      <div className="bg-white dark:bg-[#020617] rounded-[2rem] overflow-hidden shadow-2xl transition-all duration-500 border border-slate-200 dark:border-white/5 w-full max-w-xl transform scale-100 animate-in fade-in zoom-in-95 duration-300">
        {/* Header section with blue gradient */}
        <div className="bg-blue-600 dark:bg-slate-900 px-8 py-8 relative overflow-hidden transition-colors duration-500">
            <div className="absolute top-0 right-0 p-10 text-white/5 rotate-12">
                <UserPlus size={140} />
            </div>
            
            <div className="relative z-10 flex items-center justify-between">
                <div className="flex items-center gap-5">
                    <div className="bg-white/20 dark:bg-blue-600/30 p-3 rounded-2xl shadow-xl backdrop-blur-md rotate-3 hover:rotate-0 transition-transform duration-500">
                        <UserPlus size={28} className="text-white dark:text-blue-400" />
                    </div>
                    <div>
                        <p className="text-blue-100 dark:text-blue-400/60 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Portail de gestion</p>
                        <h2 className="text-3xl font-black text-white dark:text-slate-100 tracking-tight">
                            Ajouter des <span className="text-blue-200 dark:text-blue-500">élèves</span>
                        </h2>
                    </div>
                </div>
                <button 
                    onClick={onClose} 
                    className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl backdrop-blur-md transition-all active:scale-95"
                >
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-slate-50 dark:bg-slate-900/30 p-1.5 m-5 mb-2 rounded-2xl border border-slate-200 dark:border-white/5">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${
              activeTab === 'manual'
                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-500/10'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <UserPlus size={12} />
            Saisie Manuelle
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[9px] transition-all duration-300 ${
              activeTab === 'import'
                ? 'bg-white dark:bg-blue-600 text-blue-600 dark:text-white shadow-lg shadow-blue-500/10'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Upload size={12} />
            Importer Excel
          </button>
        </div>

        <div className="p-6 pt-0">
          {activeTab === 'manual' ? (
            <form action={formAction} className="space-y-6">
                {/* Identité */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1 mt-4">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Identité de l'élève</h3>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Nom de famille</label>
                            <input 
                                name="last_name" 
                                required 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Post-nom</label>
                            <input 
                                name="post_name" 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Prénom</label>
                            <input 
                                name="first_name" 
                                required 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Genre</label>
                            <select 
                                name="gender" 
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

                {/* Naissance */}
                <div className="space-y-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
                        <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">Origine & Naissance</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Date de naissance</label>
                            <input 
                                name="birth_date" 
                                type="date" 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-widest px-1">Lieu de naissance</label>
                            <input 
                                name="birthplace" 
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-white/5 rounded-xl text-slate-900 dark:text-white font-bold focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all shadow-inner text-sm" 
                            />
                        </div>
                    </div>
                </div>

              <div className="flex gap-4 pt-4">
                  <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-6 py-4 rounded-2xl border border-slate-200 dark:border-white/5 text-slate-600 dark:text-slate-400 font-black uppercase tracking-widest text-[10px] hover:bg-slate-50 dark:hover:bg-white/5 transition-all active:scale-95"
                  >
                  Annuler
                  </button>
                  <SubmitButton label="Ajouter l'élève" loadingLabel="Ajout..." />
              </div>
            </form>
          ) : (
            <div className="text-center py-12 space-y-8 animate-in fade-in slide-in-from-bottom-4">
              <div className="relative inline-block">
                <div className="bg-blue-50 dark:bg-blue-900/10 p-10 rounded-[3rem] border-2 border-dashed border-blue-200 dark:border-blue-900/30 group hover:border-blue-400 transition-colors duration-500">
                    <Upload className="mx-auto text-blue-400 group-hover:scale-110 transition-transform duration-500" size={64} />
                </div>
                <div className="absolute -top-4 -right-4 bg-white dark:bg-blue-600 p-4 rounded-[1.5rem] shadow-xl border border-blue-100 dark:border-blue-500/30">
                    <XLSXIcon className="w-8 h-8 text-green-600 dark:text-white" />
                </div>
              </div>

              <div>
                <h3 className="text-xl font-black text-slate-800 dark:text-slate-200 mb-2">Importer via Excel</h3>
                <p className="text-sm text-slate-500 dark:text-slate-500 max-w-sm mx-auto font-medium">
                  Le fichier doit contenir les colonnes :<br />
                  <span className="text-blue-600 dark:text-blue-400 font-bold">Nom, Post-nom, Prénom, Sexe, Date de naissance, Lieu de naissance</span>
                </p>
              </div>

              <div className="flex flex-col gap-4">
                <label className="cursor-pointer group">
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={loading}
                  />
                  <div className="px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
                    {loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            <span>Importation...</span>
                        </>
                    ) : (
                        <>
                            <Upload size={16} />
                            <span>Choisir un fichier</span>
                        </>
                    )}
                  </div>
                </label>
                
                <button 
                  onClick={onClose}
                  className="px-6 py-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-black uppercase tracking-widest text-[9px] transition-colors"
                >
                  Annuler
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Icône Excel Simple
 */
function XLSXIcon({ className }: { className?: string }) {
    return (
        <svg fill="currentColor" viewBox="0 0 24 24" className={className}>
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zM6 20V4h7v5h5v11H6z"/>
            <path d="M16 11h-2v2h2v2h-2v2h2v1h-3v-7h3v2zm-5 4h-1v2H9v-2H8v-2h3v2zm-1-4H8v2h2v-2z"/>
        </svg>
    )
}

/**
 * Bouton de soumission qui utilise useFormStatus pour l'état de chargement automatique (React 19)
 */
function SubmitButton({ label, loadingLabel }: { label: string; loadingLabel: string }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="flex-[2] px-6 py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-2xl shadow-blue-500/30 flex items-center justify-center gap-3 transition-all active:scale-[0.98] disabled:opacity-50"
    >
      {pending && <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
      {pending ? loadingLabel : label}
    </button>
  );
}
