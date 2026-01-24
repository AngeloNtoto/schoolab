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

export const changelog: ReleaseNote[] = [
  {
    version: "1.0.1",
    date: "24 Jan 2026",
    title: "Mise à jour majeure des Plans",
    description: "Découvrez nos nouvelles offres adaptées à vos besoins.",
    features: [
      {
        tag: "Nouveau",
        text: "Comparatif complet des plans (Gratuit, Pro, Plus) dans les paramètres."
      },
      {
        tag: "Nouveau",
        text: "Interface de contact directe pour l'activation des licences."
      },
      {
        tag: "Amélioration",
        text: "Optimisation de l'affichage sur tablettes et mobiles."
      },
      {
        tag: "Sécurité",
        text: "Renforcement de la gestion des limites d'élèves pour la version gratuite."
      }
    ]
  }
];
