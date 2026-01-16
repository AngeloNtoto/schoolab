/**
 * SetupWizard.tsx
 * 
 * Initial setup wizard for the Schoolab application.
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LEVELS, OPTIONS, SUBJECT_TEMPLATES } from '../../../constants/school';
import { ChevronRight, Calendar, Users, Check, GraduationCap, Key, Loader2, AlertCircle, Clock } from 'lucide-react';
import { getClassDisplayName } from '../../lib/classUtils';
import { useToast } from '../../context/ToastContext';
import { useLicense } from '../../context/LicenseContext';
import { licenseService } from '../../services/licenseService';
import { settingsService } from '../../services/settingsService';
import { syncService } from '../../services/syncService';
import { dbService } from '../../services/databaseService';

export default function SetupWizard() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  
  const toast = useToast();
  const { refreshLicense } = useLicense();

  // Step 1: License Activation
  const [licenseKey, setLicenseKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [activationType, setActivationType] = useState<'ACTIVATE' | 'REGISTER'>('ACTIVATE');
  const [activationError, setActivationError] = useState('');
  const [isActivated, setIsActivated] = useState(false);
  const [isTrialMode, setIsTrialMode] = useState(false);
  
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');

  // Step 2: Academic Year
  const [yearName, setYearName] = useState(`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`);
  const [startDate, setStartDate] = useState(`${new Date().getFullYear()}-09-01`);
  const [endDate, setEndDate] = useState(`${new Date().getFullYear() + 1}-07-31`);
  
  // Load existing school info if already linked
  React.useEffect(() => {
    const checkLicense = async () => {
      const info = await licenseService.getInfo();
      if (info.active) {
        setIsActivated(true);
        const name = await settingsService.get('school_name');
        const city = await settingsService.get('school_city');
        const pobox = await settingsService.get('school_pobox');
        if (name) setSchoolName(name);
        if (city) setSchoolCity(city);
        if (pobox) setSchoolPoBox(pobox);
      }
    };
    checkLicense();
  }, []);
  
  // Step 3: Classes
  const [classes, setClasses] = useState<any[]>([]);
  
  type NewClassType = {
    level: typeof LEVELS[number];
    option: typeof OPTIONS[number]['value'];
    section: string;
  };

  const [newClass, setNewClass] = useState({
    level: LEVELS[0],
    option: OPTIONS[0].value,
    section: 'A'
  } as NewClassType);

  /**
   * Activate the license key with the server
   */
  const handleActivateLicense = async () => {
    if (!licenseKey) {
      toast.error('Veuillez entrer une clé de licence.');
      return;
    }
    
    if (showPasswordPrompt && !password) {
      toast.error('Veuillez entrer le mot de passe administrateur.');
      return;
    }

    setLoading(true);
    setActivationError('');
    
    try {
      const result = await licenseService.activate(licenseKey, password);
      
      if (result.success) {
        // License activated - refresh context first
        await refreshLicense();

        // fetch school info from local settings (saved by licenseService)
        const name = await settingsService.get('school_name');
        const city = await settingsService.get('school_city');
        const pobox = await settingsService.get('school_pobox');
        
        setSchoolName(name || 'N/A');
        setSchoolCity(city || 'N/A');
        setSchoolPoBox(pobox || '');
        setIsActivated(true);
        setIsTrialMode(false);
        toast.success('Licence activée avec succès !');

        // AUTO-SYNC: Immediately pull data from cloud if PLUS
        const licenseInfo = await licenseService.getInfo();
        if (licenseInfo.plan === 'PLUS') {
          toast.info('Synchronisation automatique des données...');
          const syncResult = await syncService.start();
          
          if (syncResult.success) {
            toast.success('Données récupérées avec succès !');
            // Skip steps 2 and 3 if we got data
            const academicYearCount = await dbService.query<{count: number}>("SELECT COUNT(*) as count FROM academic_years");
            if (academicYearCount[0].count > 0) {
               navigate('/dashboard');
               try { window.dispatchEvent(new CustomEvent('db:changed', { detail: {} })); } catch (e) {}
               return;
            }
          } else {
            toast.warning('Échec de la synchronisation automatique. Veuillez configurer manuellement.');
          }
        } else {
          toast.info('Licence activée. Passez à la configuration manuelle.');
        }

      } else {
        const errorMsg = result.error || 'Erreur inconnue';
        
        if (errorMsg === 'PASSWORD_REQUIRED') {
          setActivationError('Cette licence est protégée. Veuillez entrer le mot de passe administrateur.');
          setShowPasswordPrompt(true);
          setActivationType('ACTIVATE');
        } else if (errorMsg === 'PASSWORD_REQUIRED_FOR_SETUP') {
          setActivationError('Nouvelle licence détectée. Veuillez définir un mot de passe administrateur pour la protéger.');
          setShowPasswordPrompt(true);
          setActivationType('REGISTER');
        } else if (errorMsg.includes('Invalid license key')) {
          setActivationError('Clé de licence invalide.');
          setShowPasswordPrompt(false);
        } else if (errorMsg.includes('Incorrect password')) {
          setActivationError('Mot de passe incorrect.');
        } else {
          setActivationError(`Échec: ${errorMsg}`);
        }
      }
    } catch (error) {
      setActivationError('Erreur technique lors de l\'activation.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Skip license activation and use trial mode (7 days)
   */
  const handleSkipToTrial = () => {
    setIsTrialMode(true);
    setIsActivated(false);
    toast.info('Mode d\'essai activé. Vous avez 7 jours pour tester l\'application.');
  };

  /**
   * Handle navigation between steps
   */
  const handleNext = async () => {
    if (step === 1) {
      if (!isActivated && !isTrialMode) {
        toast.warning('Activez votre licence ou choisissez le mode d\'essai.');
        return;
      }
      
      if (isTrialMode && (!schoolName || !schoolCity)) {
        toast.warning('Entrez le nom et la ville de l\'école.');
        return;
      }
      
      setStep(2);
    } else if (step === 2) {
      if (!yearName || !startDate || !endDate) return;
      setStep(3);
    } else if (step === 3) {
      await finishSetup();
    }
  };

  /**
   * Add a new class to the list
   */
  const addClass = () => {
    setClasses([...classes, { ...newClass }]);
    const nextSection = String.fromCharCode(newClass.section.charCodeAt(0) + 1);
    setNewClass({ ...newClass, section: nextSection });
  };

  /**
   * Remove a class from the list
   */
  const removeClass = (index: number) => {
    setClasses(classes.filter((_, i) => i !== index));
  };

  /**
   * Complete the setup process
   */
  const finishSetup = async () => {
    setLoading(true);
    try {
      if (isTrialMode) {
        await settingsService.set('school_name', schoolName);
        await settingsService.set('school_city', schoolCity);
        await settingsService.set('school_pobox', schoolPoBox);
      }

      // Create Academic Year
      const yearResult = await dbService.execute(
        'INSERT INTO academic_years (name, start_date, end_date, is_active) VALUES (?, ?, ?, 1)',
        [yearName, startDate, endDate]
      );
      const yearId = yearResult.lastInsertRowid;

      // Create Classes and Subjects
      for (const cls of classes) {
        const classResult = await dbService.execute(
          'INSERT INTO classes (name, level, option, section, academic_year_id) VALUES (?, ?, ?, ?, ?)',
          [
            getClassDisplayName(cls.level, cls.option, cls.section),
            cls.level,
            cls.option,
            cls.section,
            yearId
          ]
        );
        const classId = classResult.lastInsertRowid;

        // Generate Subjects based on option
        const subjects = SUBJECT_TEMPLATES[cls.option] || SUBJECT_TEMPLATES['EB'];
        if (subjects) {
          for (const sub of subjects) {
            await dbService.execute(
              'INSERT INTO subjects (name, code, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
              [sub.name, sub.code, sub.max_p1, sub.max_p2, sub.max_exam1, sub.max_p3, sub.max_p4, sub.max_exam2, classId]
            );
          }
        }
      }

      navigate('/dashboard');
      try { window.dispatchEvent(new CustomEvent('db:changed', { detail: {} })); } catch (e) { console.error('dispatch db:changed failed', e); }
    } catch (error) {
      console.error('Setup failed:', error);
      toast.error('Erreur lors de la configuration. Vérifiez la console.');
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
              <h1 className="text-3xl font-bold">Bienvenue sur Schoolab</h1>
              <p className="text-blue-100 mt-1">Assistant de configuration initiale</p>
            </div>
          </div>
        </div>

        {/* Steps Indicator */}
        <div className="flex border-b border-slate-200">
          {[
            { n: 1, label: 'Licence', icon: Key },
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
          {/* Step 1: License Activation */}
          {step === 1 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Activation de la Licence</h2>
              
              {!isActivated && !isTrialMode ? (
                <div className="space-y-4">
                  <p className="text-slate-600">Entrez votre clé de licence pour configurer votre école, ou utilisez le mode d'essai.</p>
                  
                  {/* License Key Input */}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Clé de licence</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none uppercase font-mono text-lg tracking-wider"
                      value={licenseKey}
                      onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                      placeholder="XXXX-XXXX-XXXX-XXXX"
                    />
                  </div>

                  {/* Password Input (Conditional) */}
                  {showPasswordPrompt && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                      <label className="block text-sm font-medium text-slate-700 mb-1">
                        {activationType === 'REGISTER' ? 'Définir un mot de passe administrateur' : 'Mot de passe administrateur'}
                      </label>
                      <input
                        type="password"
                        className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        autoFocus
                      />
                      <p className="text-xs text-slate-500">
                        {activationType === 'REGISTER' 
                          ? "Ce mot de passe protégera votre clé de licence sur le serveur."
                          : "Entrez le mot de passe défini lors de la première activation."
                        }
                      </p>
                    </div>
                  )}

                  {/* Error Message */}
                  {activationError && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
                      <AlertCircle className="text-red-500 flex-shrink-0 mt-0.5" size={20} />
                      <p className="text-red-700 text-sm">{activationError}</p>
                    </div>
                  )}

                  {/* Activation Button */}
                  <button
                    onClick={handleActivateLicense}
                    disabled={loading || !licenseKey}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? <Loader2 className="animate-spin" size={20} /> : <Key size={20} />}
                    {loading ? 'Activation...' : 'Activer la Licence'}
                  </button>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-slate-200"></div>
                    <span className="text-slate-400 text-sm">ou</span>
                    <div className="flex-1 h-px bg-slate-200"></div>
                  </div>

                  {/* Trial Mode Button */}
                  <button
                    onClick={handleSkipToTrial}
                    className="w-full border-2 border-slate-200 text-slate-600 py-3 rounded-lg font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                  >
                    <Clock size={20} />
                    Essai gratuit (7 jours)
                  </button>
                </div>
              ) : isTrialMode ? (
                /* Trial Mode - Need School Info */
                <div className="space-y-4">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                    <Clock className="text-amber-500 flex-shrink-0 mt-0.5" size={20} />
                    <div>
                      <p className="text-amber-700 font-semibold">Mode d'essai (7 jours)</p>
                      <p className="text-amber-600 text-sm">Entrez les informations de votre école pour continuer.</p>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de l'école *</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={schoolName}
                      onChange={(e) => setSchoolName(e.target.value)}
                      placeholder="Ex: Institut Mosala"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Ville *</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={schoolCity}
                      onChange={(e) => setSchoolCity(e.target.value)}
                      placeholder="Ex: Kinshasa"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Boîte Postale (optionnel)</label>
                    <input
                      type="text"
                      className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      value={schoolPoBox}
                      onChange={(e) => setSchoolPoBox(e.target.value)}
                      placeholder="Ex: BP 1234"
                    />
                  </div>
                </div>
              ) : (
                /* License Activated - Show School Info */
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 space-y-3">
                  <div className="flex items-center gap-3 text-green-700">
                    <Check className="bg-green-600 text-white rounded-full p-1" size={24} />
                    <span className="font-semibold text-lg">Licence Activée !</span>
                  </div>
                  <div className="text-slate-700 space-y-1">
                    <p><strong>École:</strong> {schoolName}</p>
                    <p><strong>Ville:</strong> {schoolCity}</p>
                    {schoolPoBox && <p><strong>B.P.:</strong> {schoolPoBox}</p>}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 2: Academic Year */}
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

          {/* Step 3: Classes */}
          {step === 3 && (
            <div className="space-y-6">
              <h2 className="text-xl font-semibold text-slate-800">Création des Classes</h2>
              
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 grid grid-cols-4 gap-2 items-end">
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Niveau</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.level}
                    onChange={(e) => setNewClass({ ...newClass, level: e.target.value as typeof LEVELS[number] })}
                  >
                    {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Option</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm disabled:bg-slate-100"
                    value={newClass.option}
                    onChange={(e) => setNewClass({ ...newClass, option: e.target.value as typeof OPTIONS[number]['value'] })}
                    disabled={newClass.level === '7ème' || newClass.level === '8ème'}
                  >
                    {OPTIONS.filter(o => {
                      if (newClass.level === '7ème' || newClass.level === '8ème') return o.value === 'EB';
                      return o.value !== 'EB';
                    }).map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Section</label>
                  <select
                    className="w-full p-2 border border-slate-300 rounded-md text-sm"
                    value={newClass.section}
                    onChange={(e) => setNewClass({ ...newClass, section: e.target.value })}
                  >
                    {(newClass.level !== '7ème' && newClass.level !== '8ème') && <option value="-">Sans section</option>}
                    {Array.from({ length: 26 }, (_, i) => String.fromCharCode(65 + i)).map(s => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
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
                          {getClassDisplayName(c.level, c.option, c.section)}
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
            disabled={loading || (step === 1 && !isActivated && !isTrialMode) || (step === 3 && classes.length === 0)}
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
