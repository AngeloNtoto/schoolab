import React from 'react';

export interface WorkbenchContext {
  // Pour l'instant vide, pourra contenir l'état actif, la sélection, etc.
}

export interface Command<TPayload = unknown> {
  id: string;
  title: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  when?: (ctx: WorkbenchContext) => boolean;
  run: (payload?: TPayload, ctx?: WorkbenchContext) => Promise<void> | void;
}
