import React, { useState } from 'react';
import { X, UserPlus, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { studentService } from '../services/studentService';

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
}

export default function AddStudentModal({ isOpen, onClose, onAdd, onImport,classId}: AddStudentModalProps) {
  const [activeTab, setActiveTab] = useState<'manual' | 'import'>('manual');
  
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
      alert(`Élève ${firstName} ${lastName} ajouté avec succès !`);
      
      // FERMETURE AUTOMATIQUE DU MODAL :
      // Après l'ajout réussi, on ferme le modal
      // L'utilisateur voit immédiatement le nouvel élève dans la liste
      onClose();
    } catch (error) {
      // GESTION D'ERREUR :
      // Si l'ajout échoue, on affiche un message à l'utilisateur
      console.error('Failed to add student:', error);
      alert('Erreur lors de l\'ajout de l\'élève');
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

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const students = jsonData.map((row: any) => ({
        first_name: row['Prénom'] || row['Prenom'] || '',
        last_name: row['Nom'] || '',
        post_name: row['Post-nom'] || row['Postnom'] || '',
        gender: (row['Sexe'] === 'M' || row['Sexe'] === 'F') ? row['Sexe'] : 'M',
        birth_date: row['Date de naissance'] || '',
        birthplace: row['Lieu de naissance'] || ''
      }));

      await onImport(students);
      onClose();
    } catch (error) {
      console.error('Failed to import students:', error);
      alert('Erreur lors de l\'importation du fichier Excel');
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
