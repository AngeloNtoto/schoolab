import React, { createContext, useContext, useEffect, useState } from 'react';
import { commandRegistry } from './commandRegistry';
import { Command, WorkbenchContext } from './workbenchTypes';
import { useNavigate } from 'react-router-dom';
import { dbService } from '../services/databaseService';


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
    
    // Fonction pour charger dynamiquement classes et élèves
    const loadDynamicCommands = async () => {
      try {
        const classes = await dbService.query<{id: number, name: string}>('SELECT id, name FROM classes');
        classes.forEach(c => {
          commandRegistry.registerCommand({
            id: `schoolab.openClass.${c.id}`,
            title: `Ouvrir la classe : ${c.name}`,
            category: 'Classes',
            run: () => navigate(`/class/${c.id}`)
          });
        });

        const students = await dbService.query<{id: number, first_name: string, last_name: string, class_id: number}>('SELECT id, first_name, last_name, class_id FROM students WHERE status = "active" OR status IS NULL');
        students.forEach(s => {
          commandRegistry.registerCommand({
            id: `schoolab.openStudent.${s.id}`,
            title: `Élève : ${s.first_name} ${s.last_name}`,
            category: 'Élèves',
            // Pour l'instant, navigue vers la classe de l'élève (TODO: ouvrir le modal de l'élève si supporté)
            run: () => navigate(`/class/${s.class_id}?studentId=${s.id}`) 
          });
        });

        setCommands(commandRegistry.getAllCommands());
      } catch (err) {
        console.error('Failed to load dynamic commands:', err);
      }
    };

    loadDynamicCommands();

    // Recharger lors d'un changement de la DB
    const handleDbChange = () => loadDynamicCommands();
    window.addEventListener('db:changed', handleDbChange);

    return () => window.removeEventListener('db:changed', handleDbChange);
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
