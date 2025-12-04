import React, { useState, useEffect } from 'react';
import { GraduationCap } from 'lucide-react';

interface StartupLoaderProps {
  onComplete: () => void;
}

const ALL_LOADING_MESSAGES = [
  { text: "Initialisation du noyau EcoleGest...", duration: 500 },
  { text: "Chargement de l'environnement scolaire...", duration: 600 },
  { text: "Vérification de la configuration de l'établissement...", duration: 700 },
  { text: "Connexion au registre des classes...", duration: 800 },
  { text: "Synchronisation des données élèves...", duration: 900 },
  { text: "Ouverture du module de gestion des cotes...", duration: 650 },
  { text: "Indexation des matières et branches...", duration: 500 },
  { text: "Préparation des périodes scolaires...", duration: 600 },
  { text: "Vérification de la structure des bulletins...", duration: 700 },
  { text: "Chargement des modèles de bulletins...", duration: 800 },
  { text: "Analyse des options et sections...", duration: 900 },
  { text: "Récupération des promotions en cours...", duration: 650 },
  { text: "Chargement des archives académiques...", duration: 500 },
  { text: "Mise à jour du cache des élèves...", duration: 600 },
  { text: "Vérification de la cohérence des notes...", duration: 700 },
  { text: "Initialisation de la base de données locale...", duration: 800 },
  { text: "Optimisation des requêtes pédagogiques...", duration: 900 },
  { text: "Chargement des paramètres de l'établissement...", duration: 650 },
  { text: "Application des préférences de l'utilisateur...", duration: 500 },
  { text: "Vérification des autorisations administratives...", duration: 600 },
  { text: "Activation des modules de saisie des cotes...", duration: 700 },
  { text: "Chargement des grilles d'évaluation...", duration: 800 },
  { text: "Mise en place des coefficients par matière...", duration: 900 },
  { text: "Synchronisation des périodes d'examens...", duration: 650 },
  { text: "Préparation du tableau de bord administratif...", duration: 500 },
  { text: "Initialisation du module de statistiques...", duration: 600 },
  { text: "Calcul des indicateurs de performance scolaire...", duration: 700 },
  { text: "Chargement des profils enseignants...", duration: 800 },
  { text: "Vérification des accès enseignants...", duration: 900 },
  { text: "Récupération des classes attribuées...", duration: 650 },
  { text: "Initialisation des vues par classe...", duration: 500 },
  { text: "Préparation de la liste des élèves...", duration: 600 },
  { text: "Chargement des dossiers scolaires...", duration: 700 },
  { text: "Vérification des doublons dans les dossiers...", duration: 800 },
  { text: "Mise à jour de l'index des bulletins...", duration: 900 },
  { text: "Préparation du module d'impression...", duration: 650 },
  { text: "Chargement des polices pour les bulletins...", duration: 500 },
  { text: "Vérification du format papier...", duration: 600 },
  { text: "Simulation de génération de bulletins...", duration: 700 },
  { text: "Initialisation du moteur de calcul des moyennes...", duration: 800 },
  { text: "Vérification des règles de réussite...", duration: 900 },
  { text: "Chargement des barèmes et mentions...", duration: 650 },
  { text: "Préparation des rangs par classe...", duration: 500 },
  { text: "Analyse des données des années précédentes...", duration: 600 },
  { text: "Vérification de l'intégrité des fichiers...", duration: 700 },
  { text: "Nettoyage du cache temporaire...", duration: 800 },
  { text: "Initialisation des journaux d'activité...", duration: 900 },
  { text: "Chargement du module de sauvegarde...", duration: 650 },
  { text: "Préparation de la restauration éventuelle...", duration: 500 },
  { text: "Vérification de l'espace disque disponible...", duration: 600 },
  { text: "Chargement des paramètres réseau...", duration: 700 },
  { text: "Vérification du serveur local...", duration: 800 },
  { text: "Initialisation des services internes...", duration: 900 },
  { text: "Connexion aux services d'exportation PDF...", duration: 650 },
  { text: "Préparation des gabarits d'impression...", duration: 500 },
  { text: "Vérification des marges et résolutions...", duration: 600 },
  { text: "Initialisation du suivi des modifications...", duration: 700 },
  { text: "Chargement du module de gestion des utilisateurs...", duration: 800 },
  { text: "Vérification des rôles et permissions...", duration: 900 },
  { text: "Préparation de la session administrateur...", duration: 650 },
  { text: "Chargement des préférences visuelles...", duration: 500 },
  { text: "Application du thème EcoleGest...", duration: 600 },
  { text: "Initialisation des animations d'interface...", duration: 700 },
  { text: "Chargement des composants graphiques...", duration: 800 },
  { text: "Préparation des icônes et symboles...", duration: 900 },
  { text: "Vérification de la compatibilité de la fenêtre...", duration: 650 },
  { text: "Initialisation des raccourcis clavier...", duration: 500 },
  { text: "Chargement des messages système...", duration: 600 },
  { text: "Préparation des notifications importantes...", duration: 700 },
  { text: "Vérification des paramètres régionaux...", duration: 800 },
  { text: "Chargement des formats de date et heure...", duration: 900 },
  { text: "Synchronisation de l'année scolaire courante...", duration: 650 },
  { text: "Préparation de la navigation entre les modules...", duration: 500 },
  { text: "Initialisation du module de recherche...", duration: 600 },
  { text: "Indexation des élèves et des classes...", duration: 700 },
  { text: "Chargement des filtres avancés...", duration: 800 },
  { text: "Préparation du module de duplication des bulletins...", duration: 900 },
  { text: "Vérification des modèles personnalisés...", duration: 650 },
  { text: "Chargement des paramètres de sauvegarde automatique...", duration: 500 },
  { text: "Initialisation du système de journalisation...", duration: 600 },
  { text: "Préparation des rapports récapitulatifs...", duration: 700 },
  { text: "Chargement du module de configuration avancée...", duration: 800 },
  { text: "Vérification des mises à jour logicielles...", duration: 900 },
  { text: "Analyse de l'état général du système...", duration: 650 },
  { text: "Optimisation finale des performances...", duration: 500 },
  { text: "Préparation de l'écran d'accueil...", duration: 600 },
  { text: "Chargement des widgets du tableau de bord...", duration: 700 },
  { text: "Initialisation du module d'importation de données...", duration: 800 },
  { text: "Vérification des fichiers importés...", duration: 900 },
  { text: "Préparation de la sécurité des données...", duration: 650 },
  { text: "Application des règles de confidentialité...", duration: 500 },
  { text: "Initialisation des vérifications anti-erreurs...", duration: 600 },
  { text: "Chargement des messages de validation...", duration: 700 },
  { text: "Préparation du module d'aide...", duration: 800 },
  { text: "Chargement de la documentation intégrée...", duration: 900 },
  { text: "Initialisation des info-bulles pédagogiques...", duration: 650 },
  { text: "Vérification finale de la configuration...", duration: 500 },
  { text: "Stabilisation des services EcoleGest...", duration: 600 },
  { text: "Finalisation de l'initialisation...", duration: 700 },
  { text: "Synchronisation des derniers paramètres...", duration: 800 },
];


export default function StartupLoader({ onComplete }: StartupLoaderProps) {
  const [progress, setProgress] = useState(0);
  const [messages, setMessages] = useState<string[]>([]);
  const [selectedMessages] = useState(() => {
    // Sélectionner aléatoirement entre 50 et 90 messages
    const count = Math.floor(Math.random() * 11) + 20;
    const shuffled = [...ALL_LOADING_MESSAGES].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, count);
  });
  
  // Durée aléatoire entre 30-40 secondes
  const [totalDuration] = useState(() => Math.random() * 10000+ 3000);

  useEffect(() => {
let messageTimer: ReturnType<typeof setTimeout>;
let progressTimer: ReturnType<typeof setInterval>;

    let elapsed = 0;
    let currentSpeed = 1;

    const updateProgress = () => {
      // Ralentir ou accélérer aléatoirement
      if (Math.random() < 0.1) {
        currentSpeed = Math.random() < 0.1 ? 0.2 : 0.5;
      }

      elapsed += 50 * currentSpeed;
      const newProgress = Math.min((elapsed / totalDuration) * 100, 100);
      setProgress(newProgress);

      if (newProgress >= 100) {
        clearInterval(progressTimer);
        setTimeout(() => {
          onComplete();
        }, 300);
      }
    };

    progressTimer = setInterval(updateProgress, 50);

    // Afficher les messages séquentiellement
    const showNextMessage = (index: number) => {
      if (index >= selectedMessages.length) {
        return;
      }

      setMessages(prev => [...prev, selectedMessages[index].text]);

      messageTimer = setTimeout(() => {
        showNextMessage(index + 1);
      }, selectedMessages[index].duration);
    };

    showNextMessage(0);

    return () => {
      clearInterval(progressTimer);
      clearTimeout(messageTimer);
    };
  }, []);

  // Ajouter "Chargement terminé" uniquement si >= 96%
  useEffect(() => {
    if (progress >= 96 && !messages.includes('Chargement terminé.')) {
      setMessages(prev => [...prev, 'Chargement terminé.']);
    }
  }, [progress]);

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-[2px] flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 p-6 border border-slate-200">
        {/* En-tête avec icône et titre */}
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-blue-100 p-2 rounded-lg">
            <GraduationCap className="text-blue-600" size={24} />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-slate-800">EcoleGest</h3>
            <p className="text-xs text-slate-500">Chargement en cours...</p>
          </div>
        </div>

        {/* Barre de progression */}
        <div className="mb-4">
          <div className="bg-slate-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-blue-600 transition-all duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-slate-500 mt-1 text-right font-mono">
            {Math.round(progress)}%
          </p>
        </div>

        {/* Zone de messages style installation - défilement vers le haut - 8 messages visibles */}
        <div className="bg-black rounded p-3 h-[180px] overflow-hidden relative border border-slate-700">
          <div className="absolute bottom-0 left-0 right-0 p-3 flex flex-col justify-end space-y-0">
            {messages.slice(-8).map((msg, index) => (
              <p 
                key={`${index}-${msg}`}
                className={`font-mono text-[11px] leading-none transition-all duration-300 mb-0.5 ${
                  index === messages.slice(-8).length - 1 
                    ? 'text-lime-400' 
                    : 'text-lime-500/70'
                }`}
              >
                {msg}
              </p>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
