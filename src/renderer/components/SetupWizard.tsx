import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVELS, OPTIONS, SUBJECT_TEMPLATES } from '../../constants/school';
import { ChevronRight, School, Calendar, Users, Check, GraduationCap } from 'lucide-react';

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1: School Info
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');

  // Step 2: Academic Year
  const [yearName, setYearName] = useState('2024-2025');
  const [startDate, setStartDate] = useState('2024-09-02');
  const [endDate, setEndDate] = useState('2025-07-02');

  // Step 3: Classes
  const [classes, setClasses] = useState<{ level: string; option: string; section: string }[]>([]);
  const [newClass, setNewClass] = useState({ level: '7ème' as string, option: 'EB' as string, section: 'A' });

  const handleNext = async () => {
    if (step === 1) {
      if (!schoolName || !schoolCity) return;
      setStep(2);
    } else if (step === 2) {
      if (!yearName || !startDate || !endDate) return;
      setStep(3);
    } else if (step === 3) {
      await finishSetup();
    }
  };

  const addClass = () => {
    setClasses([...classes, { ...newClass }]);
    // Reset section to next letter if possible, or keep same
    const nextSection = String.fromCharCode(newClass.section.charCodeAt(0) + 1);
    setNewClass({ ...newClass, section: nextSection });
  };

  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  const finishSetup = async () => {
    setLoading(true);
    try {
      // 1. Save Settings
      await window.api.db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['school_name', schoolName]);
      await window.api.db.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ['school_city', schoolCity]);

      // 2. Create Academic Year
      const yearResult = await window.api.db.execute(
        'INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
        [yearName, startDate, endDate]
      );
      const yearId = yearResult.lastInsertRowid;

      // 3. Create Classes and Subjects
      for (const cls of classes) {
        const classResult = await window.api.db.execute(
          'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?)',
          [`${cls.level} ${cls.option === 'EB' ? '' : cls.option} ${cls.section}`.trim(), cls.level, cls.option, cls.section, yearId]
        );
        const classId = classResult.lastInsertRowid;

        // Generate Subjects
        const subjects = SUBJECT_TEMPLATES[cls.option] || SUBJECT_TEMPLATES['EB']; // Fallback
        if (subjects) {
          for (const sub of subjects) {
            await window.api.db.execute(
              'INSERT INTO subjects (name, code, max_score, class_id) VALUES (?, ?, ?, ?)',
              [sub.name, sub.code, sub.max, classId]
            );
          }
        }
      }

      navigate('/dashboard');
    } catch (error) {
      console.error('Setup failed:', error);
      alert('Erreur lors de la configuration. Vérifiez la console.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-8"
      style={{
        backgroundImage: 'url(/assets/loading-bg.png)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-8 text-white">
          <div className="flex items-center gap-4 mb-3">
            <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
              <GraduationCap size={40} />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Bienvenue sur EcoleGest</h1>
              <p className="text-blue-100 mt-1">Assistant de configuration initiale - Configuration de votre établissement</p>
            </div>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex border-b border-slate-200">
          {[
            { n: 1, label: 'École', icon: School },
            { n: 2, label: 'Année', icon: Calendar },
            { n: 3, label: 'Classes', icon: Users },
          ].map((s) => (
            <div
              key={s.n}
              className={`flex-1 p-4 flex items-center justify-center gap-2 ${
                step >= s.n ? 'text-blue-600 font-medium' : 'text-slate-400'
              } ${step === s.n ? 'bg-blue-50' : ''}`}
            >
              <s.icon size={20} />
              <span>{s.label}</span>
            </div>
          ))}
        </div>

        {/* Content */}
        <div className="p-8">
          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Informations de l'établissement</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'école</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  placeholder="Ex: Institut Saint-Joseph"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Ville</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={schoolCity}
                  onChange={(e) => setSchoolCity(e.target.value)}
                  placeholder="Ex: Kinshasa"
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-slate-800">Année Scolaire</h2>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Intitulé</label>
                <input
                  type="text"
                  className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={yearName}
                  onChange={(e) => setYearName(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de début</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">Date de fin</label>
                  <input
                    type="date"
                    className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Création des Classes</h2>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-4 gap-2 items-end">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Niveau</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.level}
                    onChange={(e) => setNewClass({ ...newClass, level: e.target.value })}
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Option</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.option}
                    onChange={(e) => setNewClass({ ...newClass, option: e.target.value })}
                  >
                    {OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Section</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value.toUpperCase() })}
                    maxLength={1}
                  />
                </div>
                <button
                  onClick={addClass}
                  className="col-span-4 mt-2 bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 text-sm font-medium"
                >
                  Ajouter la classe
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-200 rounded-lg">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50 text-slate-500 font-medium">
                    <tr>
                      <th className="p-3">Classe</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classes.map((c, i) => (
                      <tr key={i}>
                        <td className="p-3">
                          {c.level} {c.option === 'EB' ? '' : c.option} {c.section}
                        </td>
                        <td className="p-3 text-right">
                          <button onClick={() => removeClass(i)} className="text-red-500 hover:text-red-700">
                            Supprimer
                          </button>
                        </td>
                      </tr>
                    ))}
                    {classes.length === 0 && (
                      <tr>
                        <td colSpan={2} className="p-6 text-center text-slate-400">
                          Aucune classe ajoutée
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-6 flex justify-between border-t border-slate-200">
          <button
            onClick={() => setStep(Math.max(1, step - 1))}
            disabled={step === 1}
            className={`px-4 py-2 rounded-lg font-medium ${
              step === 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-600 hover:bg-slate-200'
            }`}
          >
            Retour
          </button>
          <button
            onClick={handleNext}
            disabled={loading || (step === 3 && classes.length === 0)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Configuration...' : step === 3 ? 'Terminer' : 'Suivant'}
            {!loading && step !== 3 && <ChevronRight size={18} />}
            {!loading && step === 3 && <Check size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}
