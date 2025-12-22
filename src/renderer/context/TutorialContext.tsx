import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Interface pour une étape de tutoriel
export interface TutorialStep {
  title: string;
  content: string;
  icon?: React.ReactNode;
}

// Interface pour les données de tutoriel d'une page
export interface PageTutorial {
  pageId: string;
  title: string;
  steps: TutorialStep[];
}

// Context type
interface TutorialContextType {
  showTutorial: (pageId: string) => void;
  hideTutorial: () => void;
  resetTutorial: (pageId: string) => void;
  resetAllTutorials: () => void;
  hasSeenTutorial: (pageId: string) => boolean;
  currentTutorial: PageTutorial | null;
  isVisible: boolean;
}

const TutorialContext = createContext<TutorialContextType | null>(null);

// Données des tutoriels pour chaque page/section
export const TUTORIAL_DATA: Record<string, PageTutorial> = {
  // Dashboard
  dashboard: {
    pageId: 'dashboard',
    title: 'Tableau de bord',
    steps: [
      {
        title: 'Bienvenue sur Ecole !',
        content: 'Votre nouveau tableau de bord professionnel vous donne le contrôle total sur la gestion de vos classes et de vos élèves.'
      },
      {
        title: 'Vue d\'ensemble',
        content: 'En haut de l\'écran, vous voyez les statistiques clés : nombre total d\'élèves, de classes, d\'options et de niveaux.'
      },
      {
        title: 'Modes d\'affichage',
        content: 'Utilisez les boutons de vue pour basculer entre Grille, Liste, ou grouper vos classes par Niveau ou par Option.'
      },
      {
        title: 'Recherche et tri',
        content: 'La barre de recherche vous permet de trouver rapidement une classe. Vous pouvez aussi trier par Niveau, Option ou Nom.'
      },
      {
        title: 'Actions rapides',
        content: 'Cliquez sur une classe pour y accéder. Faites un clic droit pour des actions rapides comme modifier ou supprimer.'
      }
    ]
  },

  // Dashboard - sections
  'dashboard.viewModes': {
    pageId: 'dashboard.viewModes',
    title: 'Tableau de bord — Modes d\'affichage',
    steps: [
      {
        title: 'Changer de mode',
        content: 'Utilisez les boutons de vue pour basculer entre Grille, Liste ou grouper vos classes par Niveau ou Option.'
      },
      {
        title: 'Groupes',
        content: 'Les modes groupés affichent vos classes regroupées par critère pour une navigation plus rapide.'
      }
    ]
  },

  // Détails de classe
  classDetails: {
    pageId: 'classDetails',
    title: 'Gestion de classe',
    steps: [
      {
        title: 'Gérer votre classe',
        content: 'Cette page vous permet de gérer tous les aspects d\'une classe : élèves, matières, notes et bulletins.'
      },
      {
        title: 'Tableau des notes',
        content: 'Le tableau principal affiche tous les élèves avec leurs notes par matière. Cliquez sur une cellule pour modifier une note.'
      },
      {
        title: 'Sélection de période',
        content: 'Utilisez le sélecteur de période (P1, P2, Ex1, P3, P4, Ex2) pour afficher et modifier les notes de chaque période.'
      },
      {
        title: 'Ajouter des éléments',
        content: 'Les boutons en haut vous permettent d\'ajouter des élèves ou des matières à cette classe.'
      },
      {
        title: 'Bulletins et coupons',
        content: 'Accédez aux bulletins individuels ou générez des coupons de notes pour tous les élèves.'
      }
    ]
  },

  // Class details - sections
  'classDetails.grades': {
    pageId: 'classDetails.grades',
    title: 'Gestion de classe — Notes',
    steps: [
      {
        title: 'Tableau des notes',
        content: 'Le tableau principal affiche tous les élèves avec leurs notes par matière. Cliquez sur une cellule pour modifier une note.'
      },
      {
        title: 'Sélection de période',
        content: 'Utilisez le sélecteur de période (P1, P2, Ex1, P3, P4, Ex2) pour afficher et modifier les notes de chaque période.'
      }
    ]
  },

  // Page de paramètres
  settings: {
    pageId: 'settings',
    title: 'Paramètres',
    steps: [
      {
        title: 'Configurer votre école',
        content: 'La section "École" vous permet de définir le nom, la ville et la boîte postale de votre établissement. Ces informations apparaîtront sur les bulletins.'
      },
      {
        title: 'Personnaliser l\'apparence',
        content: 'Dans la section "Apparence", choisissez entre le mode Clair ou le mode Sombre selon vos préférences.'
      },
      {
        title: 'À propos',
        content: 'La section "À propos" affiche les informations sur la version de l\'application et le développeur.'
      }
    ]
  },

  // Paramètres - sections
  'settings.general': {
    pageId: 'settings.general',
    title: 'Paramètres — École',
    steps: [
      {
        title: 'Informations de l\'établissement',
        content: 'Ici vous pouvez définir le nom, la ville et la boîte postale. N\'oubliez pas d\'enregistrer vos modifications.'
      },
      {
        title: 'Sauvegarde',
        content: 'Cliquez sur "Enregistrer les modifications" pour persister les informations de l\'école.'
      }
    ]
  },

  'settings.appearance': {
    pageId: 'settings.appearance',
    title: 'Paramètres — Apparence',
    steps: [
      {
        title: 'Choisir un thème',
        content: 'Sélectionnez "Mode Clair" pour une interface blanche ou "Mode Sombre" pour une interface adaptée à faible luminosité.'
      },
      {
        title: 'Prévisualisation',
        content: 'Chaque option affiche une prévisualisation. Les changements sont appliqués immédiatement.'
      }
    ]
  },

  'settings.about': {
    pageId: 'settings.about',
    title: 'Paramètres — À propos',
    steps: [
      {
        title: 'Version et auteur',
        content: 'Cette section montre la version de l\'application et les informations du développeur.'
      },
      {
        title: 'Licence',
        content: 'Consultez la licence et les informations d\'usage pour connaître les conditions d\'utilisation.'
      }
    ]
  },

  // Page réseau
  network: {
    pageId: 'network',
    title: 'Réseau',
    steps: [
      {
        title: 'Serveur Web intégré',
        content: 'Cette page vous permet de démarrer un serveur web local pour accéder aux notes depuis d\'autres appareils.'
      },
      {
        title: 'Accès mobile',
        content: 'Scannez le QR code ou entrez l\'URL affichée dans un navigateur sur votre téléphone ou tablette pour saisir les notes à distance.'
      }
    ]
  },

  // Page des notes
  notes: {
    pageId: 'notes',
    title: 'Gestionnaire de notes',
    steps: [
      {
        title: 'Vos notes personnelles',
        content: 'Cette page centralise toutes vos notes et mémos concernant les élèves, les classes ou des sujets généraux.'
      },
      {
        title: 'Créer une note',
        content: 'Cliquez sur "Nouvelle note" pour ajouter une note. Vous pouvez l\'associer à un élève, une classe ou la laisser générale.'
      },
      {
        title: 'Filtrer et rechercher',
        content: 'Utilisez la barre de recherche et les filtres pour retrouver rapidement vos notes.'
      }
    ]
  },

  // Palmares
  palmares: {
    pageId: 'palmares',
    title: 'Palmarès',
    steps: [
      {
        title: 'Classement des élèves',
        content: 'Le palmarès affiche le classement de tous les élèves d\'une classe selon leurs moyennes.'
      },
      {
        title: 'Sélection de période',
        content: 'Choisissez la période pour laquelle vous souhaitez voir le classement : semestre 1, semestre 2 ou année complète.'
      },
      {
        title: 'Impression',
        content: 'Utilisez le bouton "Imprimer" pour générer une version imprimable du palmarès.'
      }
    ]
  },

  // Années académiques
  academicYears: {
    pageId: 'academicYears',
    title: 'Années académiques',
    steps: [
      {
        title: 'Gérer les années',
        content: 'Cette page vous permet de créer et gérer les années académiques de votre école.'
      },
      {
        title: 'Année active',
        content: 'L\'année marquée comme "Active" est celle actuellement utilisée. Toutes les nouvelles classes seront créées dans cette année.'
      },
      {
        title: 'Archivage',
        content: 'Les années passées sont conservées et accessibles pour consultation des données historiques.'
      }
    ]
  },

  // Bulletin
  bulletin: {
    pageId: 'bulletin',
    title: 'Bulletin scolaire',
    steps: [
      {
        title: 'Bulletin de l\'élève',
        content: 'Ce bulletin affiche toutes les notes et moyennes d\'un élève pour l\'année en cours.'
      },
      {
        title: 'Impression',
        content: 'Cliquez sur "Imprimer" pour générer un bulletin officiel prêt à être remis aux parents.'
      }
    ]
  },

  // Coupons
  classCoupons: {
    pageId: 'classCoupons',
    title: 'Coupons de notes',
    steps: [
      {
        title: 'Coupons en masse',
        content: 'Cette page génère des coupons de notes pour tous les élèves d\'une classe en une seule fois.'
      },
      {
        title: 'Sélection de période',
        content: 'Choisissez la période pour laquelle vous souhaitez générer les coupons.'
      },
      {
        title: 'Impression optimisée',
        content: 'Les coupons sont organisés pour une impression économique avec plusieurs élèves par page.'
      }
    ]
  }
};

// Provider
export function TutorialProvider({ children }: { children: ReactNode }) {
  const [currentTutorial, setCurrentTutorial] = useState<PageTutorial | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  const hasSeenTutorial = (pageId: string): boolean => {
    return localStorage.getItem(`tutorial_${pageId}`) === 'true';
  };

  const showTutorial = (pageId: string) => {
    const tutorial = TUTORIAL_DATA[pageId];
    if (tutorial && !hasSeenTutorial(pageId)) {
      setCurrentTutorial(tutorial);
      setIsVisible(true);
    }
  };

  const hideTutorial = () => {
    if (currentTutorial) {
      localStorage.setItem(`tutorial_${currentTutorial.pageId}`, 'true');
    }
    setIsVisible(false);
    setCurrentTutorial(null);
  };

  const resetTutorial = (pageId: string) => {
    localStorage.removeItem(`tutorial_${pageId}`);
  };

  const resetAllTutorials = () => {
    Object.keys(TUTORIAL_DATA).forEach(pageId => {
      localStorage.removeItem(`tutorial_${pageId}`);
    });
  };

  return (
    <TutorialContext.Provider value={{
      showTutorial,
      hideTutorial,
      resetTutorial,
      resetAllTutorials,
      hasSeenTutorial,
      currentTutorial,
      isVisible
    }}>
      {children}
    </TutorialContext.Provider>
  );
}

// Hook
export function useTutorial() {
  const context = useContext(TutorialContext);
  if (!context) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
