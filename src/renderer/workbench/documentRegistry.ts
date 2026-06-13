import React from 'react';

export interface DocumentRegistration {
  type: string;
  title: string;
  // Options futures: icônes, règles de persistance, etc.
}

class DocumentRegistry {
  private docs = new Map<string, DocumentRegistration>();

  register(type: string, title: string) {
    this.docs.set(type, { type, title });
  }

  get(type: string): DocumentRegistration | undefined {
    return this.docs.get(type);
  }
}

export const documentRegistry = new DocumentRegistry();

// Enregistrement des documents de base
documentRegistry.register('dashboard', 'Tableau de bord');
documentRegistry.register('network', 'Réseau');
documentRegistry.register('academic-years', 'Années Académiques');
documentRegistry.register('notes', 'Notes & Mémos');
documentRegistry.register('settings', 'Paramètres');
documentRegistry.register('class', 'Classe');
