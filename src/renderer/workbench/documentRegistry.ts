import React from 'react';
import Bulletin from '../components/print/Bulletin';
import ClassBulletins from '../components/print/ClassBulletins';
import ClassCoupons from '../components/print/ClassCoupons';
import Palmares from '../components/print/Palmares';
import RecentChanges from './RecentChanges';
import MacrosManager from './MacrosManager';

export interface DocumentRegistration {
  type: string;
  title: string;
  component?: React.ComponentType<any>;
}

class DocumentRegistry {
  private docs = new Map<string, DocumentRegistration>();

  register(type: string, title: string, component?: React.ComponentType<any>) {
    this.docs.set(type, { type, title, component });
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

// Enregistrement des documents imprimables (pour ouverture dans SplitView)
documentRegistry.register('print.bulletin', 'Bulletin', Bulletin);
documentRegistry.register('print.classBulletins', 'Bulletins de Classe', ClassBulletins);
documentRegistry.register('print.classCoupons', 'Coupons', ClassCoupons);
documentRegistry.register('print.palmares', 'Palmarès', Palmares);
documentRegistry.register('history.recentChanges', 'Historique & Checkpoints', RecentChanges);
documentRegistry.register('macros.manage', 'Gestion des Macros', MacrosManager);
