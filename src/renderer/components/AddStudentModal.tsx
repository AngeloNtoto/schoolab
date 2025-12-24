import React, { useState } from 'react';
import { X, UserPlus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { Student } from '../services/studentService';
import { useToast } from '../context/ToastContext';

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
  
  // Manual form state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [postName, setPostName] = useState('');
  const [gender, setGender] = useState<'M' | 'F'>('M');
  const [birthDate, setBirthDate] = useState('');
  const [birthplace, setBirthplace] = useState('');
  const [loading, setLoading] = useState(false);

  /**
   * GESTION DE LA SOUMISSION MANUELLE DU FORMULAIRE
   * 
   * Cette fonction est appelée quand l'utilisateur soumet le formulaire d'ajout manuel.
   * Elle collecte toutes les données du formulaire et appelle la fonction onAdd.
   * 
   * FLUX DE DONNÉES :
   * 1. L'utilisateur remplit le formulaire (prénom, nom, sexe, etc.)
   * 2. Cette fonction collecte ces données
   * 3. Elle ajoute le class_id (reçu en props du composant parent)
   * 4. Elle appelle onAdd qui vient du hook useStudents
   * 5. Le hook délègue au service qui insère en BDD
   * 
   * POURQUOI AJOUTER class_id ICI :
   * - Chaque élève DOIT être associé à une classe (contrainte NOT NULL en BDD)
   * - Le formulaire ne connaît pas la classe (c'est le parent qui la connaît)
   * - On reçoit classId en props du parent (ClassDetails)
   * - On doit l'ajouter aux données avant de les passer au service
   */
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // CRÉATION DE L'OBJET ÉLÈVE :
      // On collecte toutes les données du formulaire + le class_id
      await onAdd({
        first_name: firstName,        // Prénom de l'élève
        last_name: lastName,          // Nom de famille
        post_name: postName,          // Post-nom (spécifique à certaines cultures)
        gender,                       // Sexe (M ou F)
        birth_date: birthDate,        // Date de naissance
        birthplace,                   // Lieu de naissance
        class_id: classId             // ✅ CORRECTION : ID de la classe (CRUCIAL)
      });
      
      // RÉINITIALISATION DU FORMULAIRE :
      // Après succès, on vide tous les champs pour permettre d'ajouter un autre élève
      setFirstName('');
      setLastName('');
      setPostName('');
      setGender('M');
      setBirthDate('');
      setBirthplace('');

      // FEEDBACK VISUEL DE SUCCÈS :
      // On informe l'utilisateur que l'ajout a réussi
      // Note : le hook useStudents rafraîchit automatiquement la liste
      toast.success(`Élève ${firstName} ${lastName} ajouté avec succès !`);
      
      // FERMETURE AUTOMATIQUE DU MODAL :
      // Après l'ajout réussi, on ferme le modal
      // L'utilisateur voit immédiatement le nouvel élève dans la liste
      onClose();
    } catch (error) {
      // GESTION D'ERREUR :
      // Si l'ajout échoue, on affiche un message à l'utilisateur
      console.error('Failed to add student:', error);
      toast.error('Erreur lors de l\'ajout de l\'élève');
    } finally {
      // NETTOYAGE :
      // Quoi qu'il arrive (succès ou erreur), on désactive le loading
      setLoading(false);
    }
  };

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <UserPlus className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Ajouter des élèves</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200">
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'manual'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Manuel
          </button>
          <button
            onClick={() => setActiveTab('import')}
            className={`flex-1 px-4 py-3 font-medium transition-colors ${
              activeTab === 'import'
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            Importer Excel
          </button>
        </div>

        <div className="p-6">
          {activeTab === 'manual' ? (
            <form onSubmit={handleManualSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Post-nom
                  </label>
                  <input
                    type="text"
                    value={postName}
                    onChange={(e) => setPostName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Prénom <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Sexe <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="M"
                      checked={gender === 'M'}
                      onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                      className="mr-2"
                    />
                    Masculin
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="F"
                      checked={gender === 'F'}
                      onChange={(e) => setGender(e.target.value as 'M' | 'F')}
                      className="mr-2"
                    />
                    Féminin
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Date de naissance
                </label>
                <input
                  type="date"
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Lieu de naissance
                </label>
                <input
                  type="text"
                  value={birthplace}
                  onChange={(e) => setBirthplace(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
              >
                {loading ? 'Ajout...' : 'Ajouter l\'élève'}
              </button>
            </form>
          ) : (
            <div className="text-center py-8">
              <div className="mb-6">
                <Upload className="mx-auto text-slate-400 mb-4" size={48} />
                <h3 className="font-semibold text-slate-800 mb-2">Importer depuis Excel</h3>
                <p className="text-sm text-slate-500 mb-4">
                  Le fichier doit contenir les colonnes:<br />
                  Nom, Post-nom, Prénom, Sexe, Date de naissance, Lieu de naissance
                </p>
              </div>

              <label className="inline-block">
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={loading}
                />
                <span className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer inline-block font-medium transition-colors">
                  {loading ? 'Importation...' : 'Choisir un fichier'}
                </span>
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
