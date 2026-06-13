import React, { createContext, useContext, useEffect, useState } from 'react';
import { commandRegistry } from './commandRegistry';
import { Command, WorkbenchContext } from './workbenchTypes';
import { useNavigate } from 'react-router-dom';

interface WorkbenchContextType {
  executeCommand: (id: string, payload?: any) => Promise<void>;
  commands: Command<any>[];
}

const WorkbenchReactContext = createContext<WorkbenchContextType | undefined>(undefined);

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [commands, setCommands] = useState<Command<any>[]>([]);
  const navigate = useNavigate();

  // Exécution d'une commande
  const executeCommand = async (id: string, payload?: any) => {
    const ctx: WorkbenchContext = {}; 
    await commandRegistry.executeCommand(id, payload, ctx);
  };

  useEffect(() => {
    // Enregistrement des commandes de base pour la navigation
    const baseCommands: Command<any>[] = [
      {
        id: 'schoolab.openDashboard',
        title: 'Tableau de bord',
        category: 'Navigation',
        run: () => navigate('/dashboard')
      },
      {
        id: 'schoolab.openNetwork',
        title: 'Serveur Mobile',
        category: 'Navigation',
        run: () => navigate('/network')
      },
      {
        id: 'schoolab.openNotes',
        title: 'Notes & Mémos',
        category: 'Navigation',
        run: () => navigate('/notes')
      },
      {
        id: 'schoolab.openSettings',
        title: 'Paramètres',
        category: 'Navigation',
        run: () => navigate('/settings')
      },
      {
        id: 'schoolab.openAcademicYears',
        title: 'Années Académiques',
        category: 'Navigation',
        run: () => navigate('/academic-years')
      }
    ];

    baseCommands.forEach(cmd => commandRegistry.registerCommand(cmd));
    
    // Mettre à jour l'état avec toutes les commandes (base + autres)
    setCommands(commandRegistry.getAllCommands());
  }, [navigate]);

  return (
    <WorkbenchReactContext.Provider value={{ executeCommand, commands }}>
      {children}
    </WorkbenchReactContext.Provider>
  );
}

export function useWorkbench() {
  const context = useContext(WorkbenchReactContext);
  if (context === undefined) {
    throw new Error('useWorkbench doit être utilisé à l\'intérieur d\'un WorkbenchProvider');
  }
  return context;
}
