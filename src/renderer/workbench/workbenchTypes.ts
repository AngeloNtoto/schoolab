import React from 'react';

export interface WorkbenchContext {
  activeClassId?: number;
  activePeriod?: string;
  activeStudentId?: number;
  // D'autres variables de contexte peuvent être ajoutées au besoin
}

export interface Command<TPayload = unknown> {
  id: string;
  title: string;
  category: string;
  icon?: React.ComponentType<{ className?: string }>;
  shortcut?: string;
  isDestructive?: boolean;
  when?: (ctx: WorkbenchContext) => boolean;
  run: (payload?: TPayload, ctx?: WorkbenchContext) => Promise<void> | void;
}
