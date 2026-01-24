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
        text: "Découvrez nos nouvelles offres Pro et Plus adaptées à la taille de votre école."
      },
      {
        tag: "Nouveau",
        text: "Activez votre licence en un clic via WhatsApp ou Email directement depuis l'application."
      },
      {
        tag: "Amélioration",
        text: "Profitez d'une expérience fluide et agréable sur vos tablettes et smartphones."
      },
      {
        tag: "Nouveau",
        text: "Bénéficiez de réductions exceptionnelles sur les abonnements annuels (jusqu'à -40%)."
      }
    ]
  }
];
