import React, { createContext, useContext, useEffect, useState } from 'react';
import { commandRegistry } from './commandRegistry';
import { Command, WorkbenchContext } from './workbenchTypes';
import { useNavigate, useLocation } from 'react-router-dom';
import { dbService } from '../services/databaseService';
import { documentRegistry } from './documentRegistry';

export interface Tab {
  id: string;
  type: string;
  title: string;
  path: string;
}

export interface Panel {
  id: string;
  type: string;
  title: string;
  props?: any;
}

interface WorkbenchContextType {
  executeCommand: (id: string, payload?: any) => Promise<void>;
  commands: Command<any>[];
  tabs: Tab[];
  activeTabId: string | null;
  openTab: (tab: Tab) => void;
  closeTab: (id: string) => void;
  setActiveTab: (id: string) => void;
  panels: Panel[];
  activePanelId: string | null;
  openPanel: (panel: Panel) => void;
  closePanel: (id: string) => void;
  closeAllPanels: () => void;
}

const WorkbenchReactContext = createContext<WorkbenchContextType | undefined>(undefined);

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [commands, setCommands] = useState<Command<any>[]>([]);
  const [tabs, setTabs] = useState<Tab[]>(() => {
    try {
      const saved = localStorage.getItem('schoolab_workbench_tabs');
      if (saved) return JSON.parse(saved);
    } catch(e) {
      console.error('Failed to parse saved tabs', e);
    }
    return [];
  });
  const [activeTabId, setActiveTabId] = useState<string | null>(null);

  // Nouvel état pour les panneaux secondaires (Split View)
  const [panels, setPanels] = useState<Panel[]>([]);
  const [activePanelId, setActivePanelId] = useState<string | null>(null);
  
  const navigate = useNavigate();
  const location = useLocation();

  // Exécution d'une commande
  const executeCommand = async (id: string, payload?: any) => {
    const ctx: WorkbenchContext = {}; 
    await commandRegistry.executeCommand(id, payload, ctx);
  };

  // Gestion des onglets
  const openTab = (tab: Tab) => {
    setTabs(current => {
      if (!current.find(t => t.id === tab.id)) {
        return [...current, tab];
      }
      return current;
    });
    setActiveTabId(tab.id);
    navigate(tab.path);
  };

  const closeTab = (id: string) => {
    setTabs(current => {
      const newTabs = current.filter(t => t.id !== id);
      if (activeTabId === id) {
        // Sélectionner le dernier onglet restant ou null
        const nextTab = newTabs[newTabs.length - 1];
        setActiveTabId(nextTab ? nextTab.id : null);
        if (nextTab) {
          navigate(nextTab.path);
        } else {
          navigate('/dashboard'); // Fallback route
        }
      }
      return newTabs;
    });
  };

  const setActiveTab = (id: string) => {
    const tab = tabs.find(t => t.id === id);
    if (tab) {
      setActiveTabId(id);
      navigate(tab.path);
    }
  };

  // Gestion des panneaux secondaires
  const openPanel = (panel: Panel) => {
    setPanels(current => {
      // Remplacer si un panel du même ID existe, sinon ajouter
      const exists = current.find(p => p.id === panel.id);
      if (exists) {
        return current.map(p => p.id === panel.id ? panel : p);
      }
      return [...current, panel];
    });
    setActivePanelId(panel.id);
  };

  const closePanel = (id: string) => {
    setPanels(current => {
      const newPanels = current.filter(p => p.id !== id);
      if (activePanelId === id) {
        setActivePanelId(newPanels.length > 0 ? newPanels[newPanels.length - 1].id : null);
      }
      return newPanels;
    });
  };

  const closeAllPanels = () => {
    setPanels([]);
    setActivePanelId(null);
  };

  // Sync l'URL avec l'onglet actif si la navigation provient d'ailleurs (ex: Sidebar, boutons)
  useEffect(() => {
    const path = location.pathname;
    
    // Auto-enregistrement/ouverture basé sur l'URL
    let tabId = '';
    let tabType = '';
    let tabTitle = '';

    if (path.startsWith('/dashboard')) {
      tabId = 'dashboard'; tabType = 'dashboard'; tabTitle = 'Tableau de bord';
    } else if (path.startsWith('/network')) {
      tabId = 'network'; tabType = 'network'; tabTitle = 'Réseau';
    } else if (path.startsWith('/academic-years')) {
      tabId = 'academic-years'; tabType = 'academic-years'; tabTitle = 'Années Académiques';
    } else if (path.startsWith('/notes')) {
      tabId = 'notes'; tabType = 'notes'; tabTitle = 'Notes & Mémos';
    } else if (path.startsWith('/settings')) {
      tabId = 'settings'; tabType = 'settings'; tabTitle = 'Paramètres';
    } else if (path.startsWith('/class/')) {
      const classId = path.split('/')[2];
      tabId = `class:${classId}`;
      tabType = 'class';
      // Le titre précis de la classe sera mis à jour par la commande, on met un placeholder ici
      const existingCommand = commandRegistry.getCommand(`schoolab.openClass.${classId}`);
      tabTitle = existingCommand ? existingCommand.title.replace('Ouvrir la classe : ', '') : `Classe ${classId}`;
    }

    if (tabId && activeTabId !== tabId) {
      setTabs(current => {
        if (!current.find(t => t.id === tabId)) {
          return [...current, { id: tabId, type: tabType, title: tabTitle, path }];
        }
        return current;
      });
      setActiveTabId(tabId);
    }
  }, [location.pathname]);

  // Sauvegarde des onglets ouverts
  useEffect(() => {
    localStorage.setItem('schoolab_workbench_tabs', JSON.stringify(tabs));
  }, [tabs]);

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
      },
      {
        id: 'workbench.action.closeAllPanels',
        title: 'Fermer le panneau latéral',
        category: 'Affichage',
        run: () => closeAllPanels()
      },
      {
        id: 'workbench.action.openHistory',
        title: 'Voir l\'historique',
        category: 'Historique',
        run: () => openPanel({
          id: 'history',
          type: 'history.recentChanges',
          title: 'Historique & Checkpoints'
        })
      },
      {
        id: 'gradebook.action.clearCell',
        title: 'Effacer la cellule active',
        category: 'Grille de points',
        run: () => window.dispatchEvent(new CustomEvent('gradebook:clearCell'))
      },
      {
        id: 'gradebook.action.maxCell',
        title: 'Mettre la note au maximum (Cellule active)',
        category: 'Grille de points',
        run: () => window.dispatchEvent(new CustomEvent('gradebook:maxCell'))
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
    <WorkbenchReactContext.Provider value={{ 
      executeCommand, commands, 
      tabs, activeTabId, openTab, closeTab, setActiveTab,
      panels, activePanelId, openPanel, closePanel, closeAllPanels
    }}>
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
