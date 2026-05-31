import React, { useState } from 'react';
// Import du fichier package.json pour récupérer la version de l'application
import pkg from '../../../../package.json';
// Importation des icônes SVG nécessaires
import { School, Mail, Phone } from '../iconsSvg';
// Service de seeding de test pour le mode développeur
import { seedingService } from '../../services/seedingService';
// Contexte des toasts d'alertes
import { useToast } from '../../context/ToastContext';

/**
 * Composant AboutSettingsTab
 * Affiche la version actuelle de l'application, les fonctionnalités clés
 * et les coordonnées du support technique client.
 */
export default function AboutSettingsTab() {
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Titre de section */}
      <div>
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">À propos de Schoolab</h2>
        <p className="text-slate-400 dark:text-slate-500 text-xs mt-1">
          Identité de l'application et options de contact du support utilisateur.
        </p>
      </div>
      
      <div className="space-y-8">
        
        {/* Fiche identitaire de Schoolab */}
        <div className="flex flex-col sm:flex-row items-center gap-6 bg-slate-50/50 dark:bg-slate-900/30 rounded-3xl border border-slate-200/50 dark:border-white/5 p-6 shadow-sm">
          <div className="w-16 h-16 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20 text-white flex-shrink-0">
            <School size={36} />
          </div>
          <div className="text-center sm:text-left">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Schoolab Pro & Plus</h3>
            <p className="text-slate-500 dark:text-slate-400 text-xs mt-1 leading-relaxed font-medium">
              Solution unifiée de gestion scolaire et d'édition automatisée de bulletins scolaires.
            </p>
            
            <div className="flex items-center justify-center sm:justify-start gap-2.5 mt-3.5">
              <span className="inline-block px-3 py-1 bg-white dark:bg-slate-950 border border-slate-200/50 dark:border-white/5 text-[10px] font-bold rounded-full text-slate-600 dark:text-slate-355 shadow-sm">
                Version {pkg.version}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-[10px] font-bold rounded-full text-emerald-600 dark:text-emerald-400 border border-emerald-500/10">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
                Version officielle
              </span>
            </div>
          </div>
        </div>

        {/* Fonctionnalités clés incluses */}
        <div className="space-y-3.5">
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fonctionnalités Clés Actives</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2.5 text-xs text-slate-600 dark:text-slate-400 font-semibold">
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Calculatrice automatique de cotes & moyennes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Mise en page dynamique des fiches de délibération</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Arbitrage automatique des cas de repêchage</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Calcul d'application des conduites et sanctions</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Base SQL sécurisée avec chiffrement de bout en bout</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-emerald-500 font-bold">✓</span>
              <span>Réplication synchronisée des saisies d'enseignants</span>
            </div>
          </div>
        </div>

        {/* Support client */}
        <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-white/5">
          <h4 className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assistance Technique & Support Client</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Support par email */}
            <a
              href="mailto:NartrixSoft@gmail.com"
              className="flex items-center gap-4 p-4.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-2xl transition-all group"
            >
              <div className="p-3 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-xl group-hover:bg-blue-655 group-hover:text-white transition-all shadow-sm">
                <Mail size={16} />
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Courriel Support</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">NartrixSoft@gmail.com</div>
              </div>
            </a>

            {/* Support par WhatsApp */}
            <a
              href="https://wa.me/243903582030"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-4 p-4.5 bg-slate-50 dark:bg-slate-900/30 hover:bg-slate-100/50 dark:hover:bg-slate-900/60 border border-slate-200/60 dark:border-white/5 rounded-2xl transition-all group"
            >
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl group-hover:bg-emerald-655 group-hover:text-white transition-all shadow-sm">
                <Phone size={16} />
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Assistance WhatsApp</div>
                <div className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-0.5">+243 903 582 030</div>
              </div>
            </a>

          </div>
        </div>

        {/* Mentions légales */}
        <div className="pt-4 border-t border-slate-100 dark:border-white/5 flex flex-wrap items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 gap-2 font-medium">
          <span>© 2026 NartrixSoft - Tous droits réservés</span>
          <span>Licence concédée pour un usage scolaire exclusif</span>
        </div>

        {/* Seeding développeur */}
        <div className="text-center pt-4">
          <button
            type="button"
            onClick={async () => {
              const confirmed = await toast.confirm({
                title: 'Mode Développeur',
                message: 'Voulez-vous alimenter la base de données locale avec des données scolaires factices de test ?',
                confirmLabel: 'Alimenter la BDD',
                cancelLabel: 'Annuler',
                variant: 'warning'
              });

              if (confirmed) {
                setLoading(true);
                try {
                  await seedingService.seedDatabase();
                  toast.success("Base locale alimentée avec succès !");
                } catch (e) {
                  toast.error("Échec de la génération des données.");
                  console.error(e);
                } finally {
                  setLoading(false);
                }
              }
            }}
            disabled={loading}
            className="text-[9px] font-bold uppercase tracking-widest text-slate-400/40 hover:text-blue-500 hover:underline transition-all"
          >
            {loading ? "Génération..." : "Données de simulation (Mode Dev)"}
          </button>
        </div>

      </div>
    </div>
  );
}
