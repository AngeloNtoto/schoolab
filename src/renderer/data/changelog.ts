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
    version: "1.4.28",
    date: "10 Juin 2026",
    title: "Coupons annuels plus lisibles",
    description: "Amélioration de l'impression des coupons de fin d'année pour mieux utiliser la feuille et rendre les résultats plus confortables à lire.",
    features: [
      {
        tag: "Amélioration",
        text: "Les coupons de fin d'année peuvent maintenant être imprimés à deux par page avec moins d'espaces vides."
      },
      {
        tag: "Amélioration",
        text: "Les lignes et les textes du tableau annuel sont plus grands pour une lecture plus nette sur papier."
      },
      {
        tag: "Amélioration",
        text: "La présentation des coupons annuels garde un rendu plus équilibré entre les marges, les tableaux et les informations de l'élève."
      }
    ]
  },
  {
    version: "1.4.27",
    date: "10 Juin 2026",
    title: "Uniformisation des champs élève",
    description: "Harmonisation des libellés et de l'importation des élèves, avec une meilleure tolérance pour les anciennes données locales.",
    features: [
      {
        tag: "Amélioration",
        text: "Le champ prénom est désormais reconnu de façon robuste sous les variantes 'firstname', 'first_name', 'prenom' et 'prénom' dans les imports."
      },
      {
        tag: "Amélioration",
        text: "L'ordre d'affichage des grilles élève a été aligné sur Nom, Post-nom, puis Prénom pour la saisie et l'aperçu."
      },
      {
        tag: "Correctif",
        text: "Les anciennes données locales contenant des valeurs NULL dans les champs texte élèves sont désormais normalisées avant l'envoi vers le cloud."
      }
    ]
  },
  {
    version: "1.4.25",
    date: "09 Juin 2026",
    title: "Mode Réorganiser pour les cours",
    description: "Ajout d'un mode de réorganisation fiable pour remplacer le Drag & Drop lorsque Windows ou le tactile le rendent instable.",
    features: [
      {
        tag: "Nouveau",
        text: "Ajout d'un mode Réorganiser dans la gestion des cours avec boutons monter/descendre, compatible Windows et écrans tactiles."
      },
      {
        tag: "Amélioration",
        text: "L'ordre des cours peut être préparé localement puis enregistré en une seule action, avec possibilité d'annuler."
      },
      {
        tag: "Correctif",
        text: "Conservation de l'arrondi des notes converties à deux décimales dans la grille de saisie."
      }
    ]
  },
  {
    version: "1.4.24",
    date: "09 Juin 2026",
    title: "Conversion des notes & correctif Drag & Drop Windows",
    description: "Ajout d'un mode de saisie sur barème de correction et stabilisation du glisser-déposer des cours sous Windows.",
    features: [
      {
        tag: "Nouveau",
        text: "Ajout du champ 'Corrigé sur' dans la grille des notes pour convertir automatiquement une note saisie sur le barème du professeur vers le maximum réel du cours."
      },
      {
        tag: "Amélioration",
        text: "La version web/mobile de saisie des notes applique aussi la conversion de barème afin de garder le même comportement que l'application desktop."
      },
      {
        tag: "Correctif",
        text: "Stabilisation du Drag & Drop des cours sous Windows/WebView2 en corrigeant l'image de glissement et le nettoyage de fin de drag."
      }
    ]
  },
  {
    version: "1.4.22",
    date: "09 Juin 2026",
    title: "Amélioration du Drag & Drop & Interface des Bulles d'aide",
    description: "Correction du problème d'affichage du ghost de drag & drop sous Windows et refonte esthétique des bulles d'aide.",
    features: [
      {
        tag: "Correctif",
        text: "Correction du problème d'affichage du ghost de drag & drop sous Windows."
      },
      {
        tag: "Amélioration",
        text: "Refonte complète de l'esthétique des bulles d'aide avec un nouveau design moderne et contrasté."
      }
    ]
  },
  {
    version: "1.4.21",
    date: "09 Juin 2026",
    title: "Modularisation du Palmarès & Optimisations d'affichage",
    description: "Refactorisation complète du composant Palmarès en modules indépendants, avec configuration distincte des libellés avant/après délibération et optimisation de l'affichage pour les classes avec beaucoup de cours.",
    features: [
      {
        tag: "Nouveau",
        text: "Vous pouvez désormais configurer séparément les libellés des catégories du palmarès pour 'Avant Délibération' et 'Après Délibération' dans les paramètres."
      },
      {
        tag: "Amélioration",
        text: "Les échecs et repêchages dans le palmarès sont maintenant affichés en pourcentages au lieu de notes/max, pour un affichage plus compact et lisible."
      },
      {
        tag: "Correctif",
        text: "Correction de l'entassement des noms de matières dans le tableau des notes lorsque la classe contient de nombreux cours."
      }
    ]
  },
  {
    version: "1.4.20",
    date: "08 Juin 2026",
    title: "Amélioration du Palmarès & Affichage des Échecs",
    description: "Mise à jour des libellés et formatage des échecs dans les différentes catégories du palmarès.",
    features: [
      {
        tag: "Amélioration",
        text: "Le libellé de la catégorie 2 annuelle a été mis à jour vers 'II. Ont réussis avec des échecs' (uniquement avant délibération). Après délibération, le libellé de configuration normal est utilisé."
      },
      {
        tag: "Amélioration",
        text: "Pour la catégorie 2, les échecs sont désormais affichés sous le format 'cours note/max'."
      },
      {
        tag: "Amélioration",
        text: "Les matières échouées des élèves non classés (catégorie 5) sont désormais affichées en italique."
      }
    ]
  },
  {
    version: "1.4.19",
    date: "08 Juin 2026",
    title: "Amélioration du Palmarès",
    description:"Utilisation de maxima à la place de pourcentages",
    features:[
      {
        tag: "Amélioration",
        text: "Remplacement de l'affichage des echecs dans le palmarès d'avant délibération par les notes/maxima."
      },
      {
        tag: "Nouveau",
        text: "Utilisation de points virgules pour separer les echecs dans le palmares"
      }
    ]
  },
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
