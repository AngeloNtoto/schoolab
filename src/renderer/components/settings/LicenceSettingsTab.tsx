import React, { useState, useEffect } from 'react';
// Import du contexte de licence et des alertes de toast
import { useLicense } from '../../context/LicenseContext';
import { useToast } from '../../context/ToastContext';
// Import du service de validation des licences (API/HWID)
import { licenseService } from '../../services/licenseService';
// Importation des réglages pour récupérer le nom de l'école
import { settingsService } from '../../services/settingsService';
// Import des icônes SVG nécessaires
import { 
  ShieldCheck, 
  ShieldAlert, 
  RefreshCw, 
  Key, 
  User, 
  Copy, 
  Check, 
  Sparkles,
  Lock
} from '../iconsSvg';

/**
 * Composant LicenceSettingsTab
 * Permet de gérer la clé d'enregistrement du logiciel et d'activer les options premium.
 * Organisé en bi-colonne pour occuper l'espace et offrir un rendu de carte de sécurité sur la droite.
 */
export default function LicenceSettingsTab() {
  const { license: licenseStatus, refreshLicense, refreshRemoteLicense } = useLicense();
  const toast = useToast();

  // États locaux de formulaire et de chargement
  const [loading, setLoading] = useState(false);
  const [licenseKey, setLicenseKey] = useState('');
  const [password, setPassword] = useState('');
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [showLicenseForm, setShowLicenseForm] = useState(false);
  const [activationType, setActivationType] = useState<'ACTIVATE' | 'REGISTER'>('ACTIVATE');
  const [activationError, setActivationError] = useState('');
  const [hwid, setHwid] = useState('');
  const [copied, setCopied] = useState(false);
  const [schoolName, setSchoolName] = useState('Établissement Scolaire');

  // Chargement du HWID et du nom de l'école au montage
  useEffect(() => {
    async function loadIdentity() {
      try {
        const id = await licenseService.getHWID();
        setHwid(id);
        
        const name = await settingsService.get('school_name');
        if (name) setSchoolName(name);
      } catch (err) {
        console.error("Impossible de charger les infos :", err);
      }
    }
    loadIdentity();
  }, []);

  // Détermine s'il faut forcer l'affichage du formulaire au départ
  useEffect(() => {
    if (!licenseStatus?.active) {
      setShowLicenseForm(true);
    }
  }, [licenseStatus]);

  // Copie de l'identifiant matériel
  const handleCopyHWID = () => {
    if (!hwid) return;
    navigator.clipboard.writeText(hwid);
    setCopied(true);
    toast.success('ID Machine copié dans le presse-papiers !');
    setTimeout(() => setCopied(false), 2500);
  };

  // Traitement d'activation
  const handleActivate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!licenseKey) return;

    if (showPasswordPrompt && !password) {
      toast.error('Le mot de passe administrateur est requis.');
      return;
    }

    setLoading(true);
    setActivationError('');
    try {
      const result = await licenseService.activate(licenseKey, password);
      if (result.success) {
        await refreshLicense();
        toast.success('Licence Schoolab activée avec succès !');
        setLicenseKey('');
        setPassword('');
        setShowPasswordPrompt(false);
        setShowLicenseForm(false);
      } else {
        const errorMsg = result.error || 'Erreur inconnue';
        if (errorMsg === 'PASSWORD_REQUIRED') {
          setActivationError('Cette clé de licence est cryptée et sécurisée. Saisissez le mot de passe administrateur associé.');
          setShowPasswordPrompt(true);
          setActivationType('ACTIVATE');
        } else if (errorMsg === 'PASSWORD_REQUIRED_FOR_SETUP') {
          setActivationError('Nouvel enregistrement : définissez un mot de passe administrateur robuste pour sécuriser cette licence.');
          setShowPasswordPrompt(true);
          setActivationType('REGISTER');
        } else if (errorMsg.includes('Invalid license key')) {
          setActivationError('Cette clé de licence n\'existe pas ou a été saisie de manière incorrecte.');
          setShowPasswordPrompt(false);
        } else if (errorMsg.includes('Incorrect password')) {
          setActivationError('Le mot de passe administrateur fourni est incorrect.');
        } else {
          setActivationError(`Échec de validation : ${errorMsg}`);
        }
        toast.error('Échec de l\'activation');
      }
    } catch (err: any) {
      setActivationError('Le serveur de licence est injoignable ou une erreur technique est survenue.');
      toast.error('Erreur de communication serveur');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* En-tête */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Licence & Droits d'Utilisation</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Gérez l'enregistrement de ce poste et activez les modules collaboratifs multi-utilisateurs.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Colonne Gauche : Formulaires et HWID (7/12) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Widget d'état simplifié */}
          <div className={`p-5 rounded-3xl border flex items-center justify-between gap-4 transition-all shadow-sm ${
            licenseStatus?.active
              ? 'bg-emerald-500/5 border-emerald-500/20'
              : 'bg-amber-500/5 border-amber-500/20'
          }`}>
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl border shadow-sm ${
                licenseStatus?.active 
                  ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                  : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10'
              }`}>
                {licenseStatus?.active ? <ShieldCheck size={18} /> : <ShieldAlert size={18} />}
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">
                  {licenseStatus?.active ? 'Enregistrement Officiel Validé' : 'Mode Évaluation Limité'}
                </h3>
                <p className="text-slate-550 dark:text-slate-400 text-[10px] font-semibold mt-0.5">
                  {licenseStatus?.active 
                    ? `Expire le ${new Date(licenseStatus.expiresAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.`
                    : 'Fonctionnalités Cloud non disponibles.'}
                </p>
              </div>
            </div>

            {licenseStatus?.active && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setLoading(true);
                    try {
                      await refreshRemoteLicense();
                      toast.success('Licence synchronisée !');
                    } catch (e) {
                      toast.error('Erreur.');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  disabled={loading}
                  className="p-2 bg-white dark:bg-slate-950 border border-slate-200 dark:border-white/10 rounded-xl text-slate-700 dark:text-slate-350 shadow-sm"
                  title="Rafraîchir"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowLicenseForm(!showLicenseForm)}
                  className="px-3 py-1.5 bg-slate-100 dark:bg-slate-900 text-[10px] font-bold rounded-xl text-slate-700 dark:text-slate-300"
                >
                  {showLicenseForm ? 'Fermer' : 'Changer'}
                </button>
              </div>
            )}
          </div>

          {/* Formulaire d'activation */}
          {showLicenseForm && (
            <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-4 shadow-sm">
              <div>
                <h4 className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                  <Key size={14} className="text-blue-500" /> Saisir la Clé d'Enregistrement
                </h4>
                <p className="text-slate-400 dark:text-slate-500 text-[10px] mt-0.5 font-medium">
                  Entrez votre clé de produit Schoolab à 16 caractères pour authentifier le poste.
                </p>
              </div>
              
              <form onSubmit={handleActivate} className="space-y-4">
                <div className="relative">
                  <input
                    type="text"
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase font-mono font-bold text-sm tracking-widest text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-800 shadow-sm"
                    placeholder="XXXX-XXXX-XXXX-XXXX"
                  />
                  <div className="absolute top-1/2 right-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-600">
                    <Key size={14} />
                  </div>
                </div>

                {showPasswordPrompt && (
                  <div className="space-y-1.5 animate-in fade-in duration-200">
                    <label className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      {activationType === 'REGISTER' ? 'Définir le mot de passe administrateur' : 'Mot de passe administrateur'}
                    </label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-2 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                      placeholder="••••••••"
                    />
                  </div>
                )}

                {activationError && (
                  <div className="p-3.5 bg-red-500/5 border border-red-500/10 dark:border-red-500/20 rounded-2xl flex items-center gap-2 text-red-650 dark:text-red-400 text-[10px] font-bold">
                    <ShieldAlert size={14} />
                    {activationError}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !licenseKey}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white py-3 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10"
                >
                  {loading ? 'Validation...' : 'Enregistrer la Licence'}
                </button>
              </form>
            </div>
          )}

          {/* Code Machine HWID */}
          <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/50 dark:border-white/5 p-6 space-y-4 shadow-sm">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-450 dark:text-slate-400 uppercase tracking-wider">
                <User size={13} className="text-slate-400" /> Identifiant Machine (HWID)
              </div>
              <button
                type="button"
                onClick={handleCopyHWID}
                className="flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all"
              >
                {copied ? (
                  <>
                    <Check size={11} className="text-emerald-500 animate-bounce" />
                    <span className="text-emerald-500">Copié !</span>
                  </>
                ) : (
                  <>
                    <Copy size={11} />
                    <span>Copier</span>
                  </>
                )}
              </button>
            </div>
            
            <div className="bg-white dark:bg-slate-950 p-3.5 rounded-2xl border border-slate-200/80 dark:border-white/10 font-mono text-[10px] text-slate-700 dark:text-slate-400 break-all select-all shadow-inner tracking-wide font-bold">
              {hwid || 'Calcul en cours...'}
            </div>
            <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal font-medium">
              Ce jeton d'empreinte matérielle identifie votre ordinateur de manière cryptographique et sécurisée pour la délivrance des clés.
            </p>
          </div>

        </div>

        {/* Colonne Droite : Carte Visa/Certificat Premium de l'école (5/12) */}
        <div className="lg:col-span-5 sticky top-6">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-3">Badge Numérique de Licence</div>
          
          <div className={`rounded-3xl p-6 shadow-xl relative overflow-hidden text-white aspect-[1.58/1] flex flex-col justify-between transition-all duration-300 ${
            licenseStatus?.active
              ? 'bg-gradient-to-br from-emerald-500 via-teal-600 to-indigo-700 border border-emerald-400/20'
              : 'bg-gradient-to-br from-slate-650 via-slate-800 to-slate-950 border border-slate-600/20'
          }`}>
            
            {/* Effet vitré abstrait (cercles en arrière-plan) */}
            <div className="absolute -top-12 -right-12 w-32 h-32 rounded-full bg-white/5 blur-2xl" />
            <div className="absolute -bottom-16 -left-16 w-40 h-40 rounded-full bg-indigo-500/10 blur-3xl" />
            
            {/* Haut de la carte */}
            <div className="flex items-center justify-between z-10">
              <div className="flex items-center gap-1.5">
                <Sparkles size={16} className="text-yellow-300 animate-pulse" />
                <span className="text-[10px] font-black uppercase tracking-widest font-sans">Schoolab Premium</span>
              </div>
              <div className="px-2 py-0.5 bg-white/10 rounded-lg text-[8px] font-black tracking-wider uppercase border border-white/10">
                {licenseStatus?.active ? (licenseStatus.plan === 'PLUS' ? 'PLUS HUB' : 'PRO SOLO') : 'EVAL'}
              </div>
            </div>

            {/* Logo à puce SIM de sécurité */}
            <div className="my-4 flex items-center justify-between z-10">
              {/* Puce sim simu */}
              <div className="w-8 h-6 bg-gradient-to-br from-yellow-300 to-yellow-500/80 rounded-md border border-yellow-200/50 shadow-inner flex items-center justify-center">
                <div className="w-5 h-4 border border-yellow-600/30 rounded" />
              </div>
              {licenseStatus?.active ? (
                <ShieldCheck size={26} className="text-emerald-300 drop-shadow-md" />
              ) : (
                <ShieldAlert size={26} className="text-slate-400 drop-shadow-md" />
              )}
            </div>

            {/* Info Bas de carte */}
            <div className="space-y-1.5 z-10">
              
              {/* Holder Name */}
              <div className="text-[9px] font-bold tracking-wider opacity-60 uppercase">Détenteur Agréé</div>
              <div className="text-xs font-black truncate max-w-[220px]">
                {schoolName}
              </div>

              {/* Masked License Key & Expiry */}
              <div className="flex items-center justify-between text-[9px] font-mono mt-1 pt-1.5 border-t border-white/10 opacity-85">
                <span>
                  {licenseStatus?.active 
                    ? '•••• •••• •••• ' + hwid.slice(-4).toUpperCase()
                    : 'MODE ÉVALUATION CLASSIQUE'}
                </span>
                <span className="font-bold">
                  {licenseStatus?.active 
                    ? new Date(licenseStatus.expiresAt).toLocaleDateString('fr-FR', { month: '2-digit', year: '2-digit' })
                    : 'EXPIRED'}
                </span>
              </div>

            </div>

          </div>

          {/* Badge officiel de sécurité */}
          <div className="mt-5 p-5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-2xl space-y-1.5 shadow-sm">
            <h5 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-455 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Sceau NartrixSoft
            </h5>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
              Ce poste de travail est authentifié et rattaché à l'infrastructure infonuagique sécurisée de NartrixSoft. Toute sauvegarde exportée est chiffrée selon les normes AES-256 de cryptage symétrique avant transmission.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
