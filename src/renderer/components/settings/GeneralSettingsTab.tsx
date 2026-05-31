import React, { useState, useEffect } from 'react';
// Importation des icônes nécessaires
import { School, MapPin, Clipboard, Info, Lock, Check, RefreshCw } from '../iconsSvg';
// Service d'accès aux configurations locales (SQLite)
import { settingsService } from '../../services/settingsService';
// Consommation du contexte de licence et des toasts d'alerte
import { useLicense } from '../../context/LicenseContext';
import { useToast } from '../../context/ToastContext';

/**
 * Composant GeneralSettingsTab
 * Permet de configurer l'identité de l'établissement scolaire (Nom, Ville, B.P.).
 */
export default function GeneralSettingsTab() {
  const { license: licenseStatus } = useLicense();
  const toast = useToast();

  // États locaux de la fiche d'identité de l'école
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');
  const [savingSchool, setSavingSchool] = useState(false);

  // Chargement des réglages au montage du composant
  useEffect(() => {
    async function loadSchoolInfo() {
      try {
        const name = await settingsService.get('school_name');
        const city = await settingsService.get('school_city');
        const pobox = await settingsService.get('school_pobox');
        
        if (name) setSchoolName(name);
        if (city) setSchoolCity(city);
        if (pobox) setSchoolPoBox(pobox);
      } catch (e) {
        console.error("Erreur lors de la récupération des données de l'école :", e);
      }
    }
    loadSchoolInfo();
  }, []);

  // Gestion de la sauvegarde des paramètres
  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolCity.trim()) {
      toast.warning('Le nom de l\'établissement et la ville sont requis.');
      return;
    }

    setSavingSchool(true);
    try {
      // Enregistrement persistant en base SQLite
      await settingsService.set('school_name', schoolName.trim());
      await settingsService.set('school_city', schoolCity.trim());
      await settingsService.set('school_pobox', schoolPoBox.trim());
      
      toast.success('Fiche d\'identité de l\'établissement mise à jour avec succès !');
      
      // Notification globale pour forcer le rafraîchissement des autres panneaux
      try {
        window.dispatchEvent(new CustomEvent('db:changed', { detail: {} }));
      } catch (err) {}
    } catch (error) {
      console.error("Échec de la sauvegarde locale :", error);
      toast.error('Erreur technique lors de la sauvegarde.');
    } finally {
      setSavingSchool(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* En-tête de section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Fiche d'identité</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Ces informations officielles figureront sur l'en-tête de vos bulletins et palmarès.
        </p>
      </div>
      
      <form onSubmit={handleSaveSchoolInfo} className="space-y-6">
        {/* Notice d'information */}
        <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 rounded-2xl flex items-start gap-3.5 shadow-sm">
          <Info size={18} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
          <div className="text-[12px] text-slate-650 dark:text-slate-400 leading-relaxed font-medium">
            <span className="font-bold text-slate-800 dark:text-slate-200">Personnalisation des En-têtes :</span> Les valeurs ci-dessous sont enregistrées localement dans votre base de données. Vous pouvez corriger une coquille ou rajouter votre boîte postale pour ajuster précisément le format d'impression de vos documents.
          </div>
        </div>

        {/* Champs de saisie */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 shadow-sm">
          
          {/* Nom officiel de l'école */}
          <div className="space-y-2 md:col-span-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <School size={13} className="text-blue-500" /> Nom de l'Établissement <span className="text-red-500">*</span>
            </label>
            <div className="relative group">
              <input
                type="text"
                value={schoolName}
                onChange={(e) => setSchoolName(e.target.value)}
                className="w-full pl-4 pr-10 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder-slate-350 dark:placeholder-slate-800 shadow-sm"
                placeholder="Ex: Institut Scientifique Mosala"
              />
              {licenseStatus?.active && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" title="Renseigné via la licence">
                  <Lock size={14} />
                </div>
              )}
            </div>
          </div>

          {/* Ville de résidence */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <MapPin size={13} className="text-blue-500" /> Ville de Résidence <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={schoolCity}
              onChange={(e) => setSchoolCity(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder-slate-350 dark:placeholder-slate-800 shadow-sm"
              placeholder="Ex: Kinshasa / Gombe"
            />
          </div>

          {/* Boîte Postale */}
          <div className="space-y-2">
            <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-2">
              <Clipboard size={13} className="text-blue-500" /> Boîte Postale (B.P.)
            </label>
            <input
              type="text"
              value={schoolPoBox}
              onChange={(e) => setSchoolPoBox(e.target.value)}
              className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-sm font-bold text-slate-900 dark:text-white placeholder-slate-350 dark:placeholder-slate-800 shadow-sm"
              placeholder="Ex: B.P. 1045 Kinshasa I"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-white/5">
          <button
            type="submit"
            disabled={savingSchool}
            className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-650 hover:from-blue-700 hover:to-indigo-700 hover:scale-[1.02] active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition-all disabled:opacity-50 shadow-md shadow-blue-500/10"
          >
            {savingSchool ? (
              <RefreshCw size={14} className="animate-spin" />
            ) : (
              <Check size={14} />
            )}
            Sauvegarder la Fiche
          </button>
        </div>
      </form>
    </div>
  );
}
