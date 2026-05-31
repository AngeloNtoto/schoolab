import React, { useState, useEffect } from 'react';
// Importation des icônes SVG adaptées aux paramètres généraux
import { 
  School, 
  MapPin, 
  Clipboard, 
  Info, 
  Lock, 
  Check, 
  RefreshCw,
  Phone,
  Mail,
  Sparkles
} from '../iconsSvg';
// Service persistant basé sur SQLite
import { settingsService } from '../../services/settingsService';
// États partagés pour la licence et les toasts du système
import { useLicense } from '../../context/LicenseContext';
import { useToast } from '../../context/ToastContext';

/**
 * Onglet de configuration de la fiche d'identité de l'établissement.
 * Présenté sous forme de disposition bi-colonne moderne :
 * - À gauche : Le formulaire d'édition des champs réglementaires.
 * - À droite : Une simulation dynamique et esthétique de l'en-tête officiel (lettre à en-tête) imprimé.
 */
export default function GeneralSettingsTab() {
  const { license: licenseStatus } = useLicense();
  const toast = useToast();

  // États locaux du formulaire d'identité
  const [schoolName, setSchoolName] = useState('');
  const [schoolCity, setSchoolCity] = useState('');
  const [schoolPoBox, setSchoolPoBox] = useState('');
  const [schoolProvince, setSchoolProvince] = useState('');
  const [schoolMotto, setSchoolMotto] = useState('');
  const [schoolPhone, setSchoolPhone] = useState('');
  const [schoolEmail, setSchoolEmail] = useState('');
  
  const [savingSchool, setSavingSchool] = useState(false);

  // Récupération des valeurs existantes depuis SQLite dès le chargement du composant
  useEffect(() => {
    async function loadSchoolInfo() {
      try {
        const name = await settingsService.get('school_name');
        const city = await settingsService.get('school_city');
        const pobox = await settingsService.get('school_pobox');
        const province = await settingsService.get('school_province') || 'Kinshasa-Lukunga';
        const motto = await settingsService.get('school_motto') || 'Science - Conscience - Discipline';
        const phone = await settingsService.get('school_phone') || '+243 812 345 678';
        const email = await settingsService.get('school_email') || 'info@etablissement.cd';
        
        if (name) setSchoolName(name);
        if (city) setSchoolCity(city);
        if (pobox) setSchoolPoBox(pobox);
        setSchoolProvince(province);
        setSchoolMotto(motto);
        setSchoolPhone(phone);
        setSchoolEmail(email);
      } catch (e) {
        console.error("Erreur lors de la lecture des paramètres de l'école :", e);
      }
    }
    loadSchoolInfo();
  }, []);

  // Traitement et écriture persistante des informations scolaires
  const handleSaveSchoolInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolName.trim() || !schoolCity.trim()) {
      toast.warning('Le nom de l\'établissement et la ville sont obligatoires pour les en-têtes.');
      return;
    }

    setSavingSchool(true);
    try {
      // Sauvegarde des champs classiques
      await settingsService.set('school_name', schoolName.trim());
      await settingsService.set('school_city', schoolCity.trim());
      await settingsService.set('school_pobox', schoolPoBox.trim());
      
      // Enregistrement des nouveaux attributs d'identité enrichis
      await settingsService.set('school_province', schoolProvince.trim());
      await settingsService.set('school_motto', schoolMotto.trim());
      await settingsService.set('school_phone', schoolPhone.trim());
      await settingsService.set('school_email', schoolEmail.trim());
      
      toast.success('Fiche d\'identité de l\'établissement mise à jour avec succès !');
      
      // Diffusion d'un événement global pour recharger le titre du tableau de bord et les bulletins
      try {
        window.dispatchEvent(new CustomEvent('db:changed', { detail: {} }));
      } catch (err) {}
    } catch (error) {
      console.error("Échec de l'écriture en base SQLite :", error);
      toast.error('Erreur technique lors de la sauvegarde.');
    } finally {
      setSavingSchool(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* En-tête et descriptif */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">Fiche d'identité de l'Établissement</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Renseignez les données officielles et de communication de votre école. Elles structurent le lettrage de vos bulletins.
        </p>
      </div>
      
      {/* Grille bi-colonne responsive pour occuper harmonieusement l'espace horizontal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Formulaire d'édition (colonne gauche : 7/12) */}
        <form onSubmit={handleSaveSchoolInfo} className="lg:col-span-7 space-y-6">
          
          <div className="p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/10 dark:border-blue-500/20 rounded-2xl flex items-start gap-3 shadow-sm">
            <Info size={16} className="text-blue-500 dark:text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed font-semibold">
              Les paramètres ci-dessous servent à composer l'en-tête ministériel officiel de vos bulletins. Toute modification sera répercutée instantanément sur vos PDF de bulletins et palmarès.
            </div>
          </div>

          <div className="bg-slate-50/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-white/5 rounded-3xl p-6 space-y-4 shadow-sm">
            
            {/* 1. Nom officiel */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <School size={12} className="text-blue-500" /> Nom de l'Établissement <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={schoolName}
                  onChange={(e) => setSchoolName(e.target.value)}
                  className="w-full pl-4 pr-10 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white placeholder-slate-350 dark:placeholder-slate-800 shadow-sm"
                  placeholder="Ex: Institut Scientifique Mosala"
                />
                {licenseStatus?.active && (
                  <div className="absolute right-4.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-600" title="Enregistré">
                    <Lock size={12} />
                  </div>
                )}
              </div>
            </div>

            {/* 2. Devise / Motto */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={12} className="text-blue-500" /> Devise de l'école
              </label>
              <input
                type="text"
                value={schoolMotto}
                onChange={(e) => setSchoolMotto(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white placeholder-slate-350 dark:placeholder-slate-800 shadow-sm"
                placeholder="Ex: Science - Conscience - Discipline"
              />
            </div>

            {/* Grille double : Province et Ville */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Province éducationnelle */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-500" /> Province Éduc. <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolProvince}
                  onChange={(e) => setSchoolProvince(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                  placeholder="Ex: Kinshasa-Lukunga"
                />
              </div>

              {/* Ville */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <MapPin size={12} className="text-blue-500" /> Ville de Résidence <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={schoolCity}
                  onChange={(e) => setSchoolCity(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                  placeholder="Ex: Kinshasa"
                />
              </div>

            </div>

            {/* Grille double : Boîte Postale et Téléphone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Boîte postale */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Clipboard size={12} className="text-blue-500" /> Boîte Postale (B.P.)
                </label>
                <input
                  type="text"
                  value={schoolPoBox}
                  onChange={(e) => setSchoolPoBox(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                  placeholder="Ex: B.P. 1045 Kinshasa I"
                />
              </div>

              {/* Téléphone officiel */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Phone size={12} className="text-blue-500" /> Téléphone de Contact
                </label>
                <input
                  type="text"
                  value={schoolPhone}
                  onChange={(e) => setSchoolPhone(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                  placeholder="Ex: +243 812 345 678"
                />
              </div>

            </div>

            {/* Courriel officiel */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Mail size={12} className="text-blue-500" /> Courriel Établissement
              </label>
              <input
                type="email"
                value={schoolEmail}
                onChange={(e) => setSchoolEmail(e.target.value)}
                className="w-full px-4 py-2.5 bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-2xl focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all text-xs font-bold text-slate-900 dark:text-white shadow-sm"
                placeholder="Ex: contact@ecolemosala.cd"
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

        {/* Colonne droite : Aperçu live de l'en-tête officiel du bulletin (colonne droite : 5/12) */}
        <div className="lg:col-span-5 space-y-6 sticky top-6">
          <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Aperçu en-tête des Bulletins</div>
          
          <div className="bg-white dark:bg-slate-950 border border-slate-200/80 dark:border-white/10 rounded-3xl p-6 shadow-md relative overflow-hidden font-serif">
            
            {/* Liseré tricolore de la RDC pour faire très officiel */}
            <div className="absolute top-0 left-0 right-0 h-1.5 flex">
              <div className="flex-1 bg-sky-500"></div>
              <div className="w-1/6 bg-yellow-400"></div>
              <div className="w-1/6 bg-red-500"></div>
            </div>

            {/* Corps de l'en-tête officiel */}
            <div className="text-center text-[8px] text-slate-800 dark:text-slate-300 leading-normal uppercase space-y-0.5 pt-2">
              <div className="font-semibold tracking-wider">République Démocratique du Congo</div>
              <div className="font-medium text-slate-500 dark:text-slate-400">Ministère de l'Enseignement Primaire, Secondaire et Technique</div>
              
              <div className="h-2"></div>
              
              <div className="font-bold border-b border-dashed border-slate-300 dark:border-slate-800 pb-1.5">
                PROVINCE ÉDUCATIONNELLE : <span className="text-slate-900 dark:text-white">{schoolProvince || '------'}</span>
              </div>
              
              <div className="h-4"></div>
              
              {/* Nom officiel de l'école */}
              <div className="text-sm font-black text-slate-900 dark:text-white tracking-tight normal-case">
                {schoolName || 'Nom de votre école'}
              </div>
              
              {/* Devise */}
              <div className="text-[9px] italic text-slate-500 dark:text-slate-400 font-medium lowercase tracking-wide normal-case mt-0.5">
                "{schoolMotto || 'Devise de l\'école'}"
              </div>

              <div className="h-4"></div>

              {/* Coordonnées administratives */}
              <div className="text-[8px] text-slate-500 dark:text-slate-500 border-t border-dashed border-slate-300 dark:border-slate-800 pt-2 flex flex-col items-center gap-0.5 normal-case font-medium">
                <div>
                  <span className="font-bold">B.P. :</span> {schoolPoBox || '------'} — <span className="font-bold">Ville :</span> {schoolCity || '------'}
                </div>
                <div>
                  <span className="font-bold">Tél :</span> {schoolPhone || '------'} | <span className="font-bold">Email :</span> {schoolEmail || '------'}
                </div>
              </div>

            </div>

          </div>

          {/* Note informative en bas de l'aperçu */}
          <div className="p-5 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-2xl space-y-1.5 shadow-sm">
            <h5 className="text-[10px] font-bold text-emerald-600 dark:text-emerald-455 uppercase tracking-wide flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" /> Rendu PDF Vectorisé
            </h5>
            <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal font-medium">
              Ce bloc d'en-tête officiel est encodé au format PDF vectoriel haute définition lors de l'impression physique ou virtuelle. Il garantit une clarté administrative optimale pour la direction provinciale.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
