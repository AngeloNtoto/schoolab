import React, { useState, useEffect } from 'react';
// Import du contexte de licence et des alertes de toast
import { useLicense } from '../../context/LicenseContext';
import { useToast } from '../../context/ToastContext';
// Import du service de validation des licences (API/HWID)
import { licenseService } from '../../services/licenseService';
// Import des icônes SVG nécessaires
import { ShieldCheck, ShieldAlert, RefreshCw, Key, User, Copy, Check } from '../iconsSvg';

/**
 * Composant LicenceSettingsTab
 * Permet de gérer la clé d'enregistrement du logiciel et d'activer les options premium.
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

  // Chargement du HWID au montage
  useEffect(() => {
    async function loadHWID() {
      try {
        const id = await licenseService.getHWID();
        setHwid(id);
      } catch (err) {
        console.error("Impossible de récupérer l'identifiant machine (HWID) :", err);
      }
    }
    loadHWID();
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
      {/* Titre principal */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Licence & Enregistrement</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Consultez le statut de votre droit d'utilisation et gérez vos clés de licence.
        </p>
      </div>
      
      <div className="space-y-6">
        
        {/* Widget d'état de licence */}
        <div className={`p-6 rounded-3xl border flex flex-col md:flex-row items-start md:items-center justify-between gap-6 transition-all shadow-sm ${
          licenseStatus?.active
            ? 'bg-gradient-to-br from-emerald-500/5 to-teal-500/5 dark:from-emerald-500/10 dark:to-teal-500/5 border-emerald-500/20'
            : 'bg-gradient-to-br from-amber-500/5 to-orange-500/5 dark:from-amber-500/10 dark:to-orange-500/5 border-amber-500/20'
        }`}>
          <div className="flex items-start gap-4">
            <div className={`p-3.5 rounded-2xl border shadow-sm ${
              licenseStatus?.active 
                ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/10' 
                : 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/10'
            }`}>
              {licenseStatus?.active ? <ShieldCheck size={24} /> : <ShieldAlert size={24} />}
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                {licenseStatus?.active 
                  ? (licenseStatus.plan === 'PLUS' ? 'Schoolab Premium Plus' : 'Schoolab Premium Pro') 
                  : 'Version Gratuite / Évaluation'}
              </h3>
              <p className="text-slate-600 dark:text-slate-400 text-xs mt-1 leading-normal font-medium">
                {licenseStatus?.active 
                  ? `Enregistrement valide. Expiration le ${new Date(licenseStatus.expiresAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}.`
                  : 'Aucune licence active détectée sur ce poste. Accès restreint aux modules cloud.'}
              </p>
              
              {/* Barre de validité */}
              {licenseStatus?.active && licenseStatus.daysRemaining !== undefined && (
                <div className="mt-4 space-y-2">
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    <span>Durée de validité</span>
                    <span className="text-emerald-600 dark:text-emerald-400">{licenseStatus.daysRemaining} Jour(s) Restant(s)</span>
                  </div>
                  <div className="w-64 h-2 bg-slate-100 dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all rounded-full"
                      style={{ width: `${Math.min(100, (licenseStatus.daysRemaining / 365) * 100)}%` }}
                    ></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          {licenseStatus?.active && (
            <div className="flex flex-col sm:flex-row gap-2.5 w-full md:w-auto">
              <button
                type="button"
                onClick={async () => {
                  setLoading(true);
                  try {
                    await refreshRemoteLicense();
                    toast.success('Synchronisation de la licence réussie !');
                  } catch (e) {
                    toast.error('Erreur lors de la synchronisation.');
                  } finally {
                    setLoading(false);
                  }
                }}
                disabled={loading}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 border border-slate-200/80 dark:border-white/10 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all shadow-sm"
              >
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                Mettre à jour
              </button>
              <button
                type="button"
                onClick={() => setShowLicenseForm(!showLicenseForm)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 dark:bg-slate-900 hover:bg-slate-200/85 dark:hover:bg-slate-800 rounded-2xl text-xs font-bold text-slate-700 dark:text-slate-300 transition-all"
              >
                <Key size={13} />
                {showLicenseForm ? 'Masquer Clé' : 'Changer Clé'}
              </button>
            </div>
          )}
        </div>

        {/* Formulaire d'activation */}
        {showLicenseForm && (
          <div className="bg-slate-50/50 dark:bg-slate-900/30 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-5 animate-in fade-in slide-in-from-top-2 duration-200 shadow-sm">
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Key size={16} className="text-blue-500" />
                Enregistrer une Clé de Licence
              </h4>
              <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
                Saisissez le code d'activation fourni lors de l'acquisition de votre formule Schoolab.
              </p>
            </div>
            
            <form onSubmit={handleActivate} className="space-y-4">
              <div className="relative">
                <input
                  type="text"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value.toUpperCase())}
                  className="w-full px-4 py-3.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all uppercase font-mono font-bold text-base tracking-widest text-slate-900 dark:text-white placeholder-slate-300 dark:placeholder-slate-800 shadow-sm"
                  placeholder="XXXX-XXXX-XXXX-XXXX"
                />
                <div className="absolute top-1/2 right-4.5 -translate-y-1/2 text-slate-400 dark:text-slate-600">
                  <Key size={16} />
                </div>
              </div>

              {showPasswordPrompt && (
                <div className="space-y-2 animate-in fade-in duration-200">
                  <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    {activationType === 'REGISTER' ? 'Définir le mot de passe administrateur' : 'Mot de passe administrateur'}
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white shadow-sm"
                    placeholder="••••••••"
                  />
                </div>
              )}

              {activationError && (
                <div className="p-4 bg-red-500/5 border border-red-500/10 dark:border-red-500/20 rounded-2xl flex items-center gap-2.5 text-red-650 dark:text-red-400 text-xs font-bold">
                  <ShieldAlert size={15} />
                  {activationError}
                </div>
              )}

              <button
                type="submit"
                disabled={loading || !licenseKey}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 text-white py-3.5 rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10 hover:scale-[1.01] active:scale-[0.99]"
              >
                {loading ? 'Validation en cours...' : 'Activer Schoolab Premium'}
              </button>
            </form>
          </div>
        )}

        {/* Identifiant unique machine (HWID) */}
        <div className="bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/50 dark:border-white/5 p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400">
              <User size={14} className="text-slate-400" />
              <span>Identifiant Unique du Poste (HWID)</span>
            </div>
            <button
              type="button"
              onClick={handleCopyHWID}
              className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline transition-all"
            >
              {copied ? (
                <>
                  <Check size={12} className="text-emerald-500 animate-bounce" />
                  <span className="text-emerald-500">Copié avec succès !</span>
                </>
              ) : (
                <>
                  <Copy size={12} />
                  <span>Copier le HWID</span>
                </>
              )}
            </button>
          </div>
          
          <div className="bg-white dark:bg-slate-950 p-4 rounded-2xl border border-slate-200/80 dark:border-white/10 font-mono text-xs text-slate-700 dark:text-slate-400 break-all select-all shadow-inner tracking-wide leading-relaxed font-bold">
            {hwid || 'Calcul de l\'identifiant matériel unique...'}
          </div>
          <p className="text-[10px] text-slate-400 dark:text-slate-550 leading-normal font-medium">
            Ce code unique est généré cryptographiquement pour identifier cet ordinateur. Communiquez-le à l'équipe technique Schoolab afin de générer vos licences de poste.
          </p>
        </div>

      </div>
    </div>
  );
}
