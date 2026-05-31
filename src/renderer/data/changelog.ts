// Ce fichier définit les notes de version de Schoolab affichées dans l'application
export interface ReleaseNote {
  version: string;
  date: string;
  title: string;
  description?: string;
  features: {
    tag: 'Nouveau' | 'Amélioration' | 'Correctif' | 'Sécurité';
    text: string;
  }[];
}

// Liste historique des versions triée par ordre décroissant (la plus récente d'abord)
export const changelog: ReleaseNote[] = [
  {
    version: "1.4.18",
    date: "31 Mai 2026",
    title: "Refactoring modulaire des Paramètres & améliorations visuelles",
    description: "La page de configuration a été entièrement restructurée en composants indépendants pour plus de maintenabilité et de clarté.",
    features: [
      {
        tag: "Amélioration",
        text: "Refactoring complet de la page Paramètres en 7 sous-composants modulaires autonomes (Établissement, Thème, Impression, Délibération, Licence, Cloud, À propos)."
      },
      {
        tag: "Amélioration",
        text: "Enrichissement visuel des onglets de paramètres avec mise en page double colonne et prévisualisations dynamiques."
      },
      {
        tag: "Nouveau",
        text: "Ajout de l'onglet de gestion académique dans les paramètres."
      },
      {
        tag: "Correctif",
        text: "Correction du tri des classes respectant l'ordre scolaire congolais (7ème → 8ème → 1ère → 4ème) avec persistance des préférences."
      },
      {
        tag: "Amélioration",
        text: "Élargissement du modal d'ajout de cours pour un meilleur confort de saisie."
      }
    ]
  },
  {
    version: "1.4.17",
    date: "31 Mai 2026",
    title: "Amélioration de la gestion des cours et des classes",
    description: "Nouvel outil de création en lot et ergonomie améliorée pour la gestion de vos classes.",
    features: [
      {
        tag: "Nouveau",
        text: "Création rapide des cours par Maxima en lot (saisie simplifiée via file d'attente)."
      },
      {
        tag: "Nouveau",
        text: "Création multiple de classes (saisie par virgules, ex: A, B, C) avec conservation de la boîte de dialogue ouverte."
      },
      {
        tag: "Nouveau",
        text: "Possibilité de cloner les cours depuis une autre classe lors de la création d'une nouvelle classe."
      },
      {
        tag: "Amélioration",
        text: "Glisser-déposer (Drag & Drop) des cours repensé avec des interlignes interactives et lumineuses au survol."
      },
      {
        tag: "Amélioration",
        text: "La section par défaut d'une classe d'humanités est désormais initialisée à 'Sans section' (-) au lieu de 'A'."
      },
      {
        tag: "Correctif",
        text: "Suppression de l'ancien bouton de déplacement et ajustement vertical de l'affichage des cartes de cours."
      }
    ]
  },
  {
    version: "1.0.1",
    date: "24 Jan 2026",
    title: "Mise à jour majeure des Plans",
    description: "Découvrez nos nouvelles offres adaptées à vos besoins.",
    features: [
      {
        tag: "Nouveau",
        text: "Découvrez nos nouvelles offres Pro et Plus adaptées à la taille de votre école."
      },
      {
        tag: "Nouveau",
        text: "Activez votre licence en un clic via WhatsApp ou Email directement depuis l'application."
      },
      {
        tag: "Amélioration",
        text: "Profitez d'une expérience fluide et agréable sur votre ordinateur."
      },
      {
        tag: "Nouveau",
        text: "Bénéficiez de réductions exceptionnelles sur les abonnements annuels (jusqu'à -40%)."
      }
    ]
  }
];
