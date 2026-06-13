import React, { useEffect, useState, useCallback } from 'react';
import { classService, ClassData } from '../services/classService';
import { academicYearService } from '../services/academicYearService';
import { useWorkbench } from './WorkbenchProvider';
import { ChevronRight, ChevronDown, Archive as Folder, FileText, Search, Plus } from '../components/iconsSvg';
import EditClassModal from '../components/class/EditClassModal';

interface ExplorerPaneProps {
  width: number;
  setWidth: (width: number) => void;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'class';
  classData?: ClassData;
  children?: TreeNode[];
  isOpen?: boolean;
}

export default function ExplorerPane({ width, setWidth }: ExplorerPaneProps) {
  const [nodes, setNodes] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isResizing, setIsResizing] = useState(false);
  const [showCreateClassModal, setShowCreateClassModal] = useState(false);
  const { executeCommand, activeTabId } = useWorkbench();

  const loadClasses = useCallback(async () => {
    try {
      setLoading(true);
      const [classes, academicYears] = await Promise.all([
        classService.getAllClasses(),
        academicYearService.getAll()
      ]);
      
      // Custom sort for DRC levels: 7ème, 8ème, 1ère, 2ème, 3ème, 4ème
      const levelOrder: Record<string, number> = {
        '7ème': 1,
        '8ème': 2,
        '1ère': 3,
        '2ème': 4,
        '3ème': 5,
        '4ème': 6
      };

      const getLevelValue = (level: string) => {
        for (const [key, val] of Object.entries(levelOrder)) {
          if (level.includes(key) || level.includes(key.replace('ème', ''))) return val;
        }
        const num = parseInt(level);
        return isNaN(num) ? 99 : num;
      };

      const rootNodes: TreeNode[] = [];

      // Create a fallback year for classes without an academic_year_id
      const unassignedYear = { id: 0, name: 'Classes Non Assignées', is_active: false, start_date: '', end_date: '' };
      const allYears = [...academicYears];

      // Distribute classes by academic year
      const classesByYear = new Map<number, ClassData[]>();
      classes.forEach(cls => {
        const yearId = cls.academic_year_id || 0;
        if (!classesByYear.has(yearId)) {
          classesByYear.set(yearId, []);
        }
        classesByYear.get(yearId)!.push(cls);
      });

      // If there are unassigned classes, add the fallback year to the list
      if (classesByYear.has(0)) {
        allYears.push(unassignedYear);
      }

      // Process each academic year
      allYears.forEach(year => {
        const yearClasses = classesByYear.get(year.id) || [];
        if (yearClasses.length === 0 && !year.is_active) return; // Skip empty inactive years
        
        // 1. Group by Option
        const optionMap = new Map<string, TreeNode>();
        // 2. Group by Level
        const levelMap = new Map<string, TreeNode>();

        yearClasses.forEach((cls: ClassData) => {
          // --- Group by Option ---
          const optionName = cls.option || 'Générale';
          if (!optionMap.has(optionName)) {
            optionMap.set(optionName, {
              id: `y${year.id}_opt_${optionName}`,
              name: optionName,
              type: 'folder',
              isOpen: false,
              children: []
            });
          }
          optionMap.get(optionName)!.children!.push({
            id: `y${year.id}_opt_class_${cls.id}`,
            name: `${cls.level} ${cls.option || ''}`.trim(),
            type: 'class',
            classData: cls
          });

          // --- Group by Level ---
          const levelName = cls.level || 'Non défini';
          if (!levelMap.has(levelName)) {
            levelMap.set(levelName, {
              id: `y${year.id}_lvl_${levelName}`,
              name: levelName,
              type: 'folder',
              isOpen: false,
              children: []
            });
          }
          levelMap.get(levelName)!.children!.push({
            id: `y${year.id}_lvl_class_${cls.id}`,
            name: `${cls.level} ${cls.option || ''}`.trim(),
            type: 'class',
            classData: cls
          });
        });

        // Sort classes inside Options by Level
        const optionFolders = Array.from(optionMap.values()).sort((a, b) => a.name.localeCompare(b.name));
        optionFolders.forEach(folder => {
          folder.children!.sort((a, b) => {
            const lA = getLevelValue(a.classData!.level);
            const lB = getLevelValue(b.classData!.level);
            if (lA !== lB) return lA - lB;
            return a.name.localeCompare(b.name);
          });
        });

        // Sort Level folders by custom level order
        const levelFolders = Array.from(levelMap.values()).sort((a, b) => {
          const lA = getLevelValue(a.name);
          const lB = getLevelValue(b.name);
          if (lA !== lB) return lA - lB;
          return a.name.localeCompare(b.name);
        });
        // Sort classes inside Levels by Option
        levelFolders.forEach(folder => {
          folder.children!.sort((a, b) => (a.classData!.option || '').localeCompare(b.classData!.option || ''));
        });

        const yearNode: TreeNode = {
          id: `root_year_${year.id}`,
          name: year.name + (year.is_active ? ' (Active)' : ''),
          type: 'folder',
          isOpen: year.is_active, // Open by default if it's the active year
          children: [
            {
              id: `y${year.id}_by_option`,
              name: 'Par Option',
              type: 'folder',
              isOpen: true,
              children: optionFolders
            },
            {
              id: `y${year.id}_by_level`,
              name: 'Par Niveau',
              type: 'folder',
              isOpen: false,
              children: levelFolders
            }
          ]
        };

        rootNodes.push(yearNode);
      });

      // Sort root nodes (Active year first, then by name descending)
      rootNodes.sort((a, b) => {
        if (a.isOpen && !b.isOpen) return -1;
        if (!a.isOpen && b.isOpen) return 1;
        return b.name.localeCompare(a.name);
      });

      setNodes(rootNodes);
    } catch (err) {
      console.error('Failed to load classes for explorer', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClasses();
    window.addEventListener('db:changed', loadClasses);
    return () => window.removeEventListener('db:changed', loadClasses);
  }, [loadClasses]);

  const toggleFolder = (id: string) => {
    setNodes(prevNodes => {
      const toggleNode = (list: TreeNode[]): TreeNode[] => {
        return list.map(node => {
          if (node.id === id) {
            return { ...node, isOpen: !node.isOpen };
          }
          if (node.children) {
            return { ...node, children: toggleNode(node.children) };
          }
          return node;
        });
      };
      return toggleNode(prevNodes);
    });
  };

  const handleClassClick = (classId: number) => {
    executeCommand(`schoolab.openClass.${classId}`);
  };

  // Resizing logic
  const startResizing = React.useCallback(() => {
    setIsResizing(true);
  }, []);

  const stopResizing = React.useCallback(() => {
    setIsResizing(false);
  }, []);

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = mouseMoveEvent.clientX - 56; // 56px is ActivityBar width roughly
        if (newWidth >= 150 && newWidth <= 500) {
          setWidth(newWidth);
        }
      }
    },
    [isResizing, setWidth]
  );

  useEffect(() => {
    window.addEventListener('mousemove', resize);
    window.addEventListener('mouseup', stopResizing);
    return () => {
      window.removeEventListener('mousemove', resize);
      window.removeEventListener('mouseup', stopResizing);
    };
  }, [resize, stopResizing]);

  const renderNode = (node: TreeNode, depth: number = 0) => {
    if (node.type === 'folder') {
      const matchSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());
      const hasMatchingChild = node.children?.some(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (searchQuery && !matchSearch && !hasMatchingChild) return null;

      return (
        <div key={node.id}>
          <div 
            className="flex items-center gap-1.5 px-2 py-1 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-700 dark:text-slate-300 transition-colors"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
            onClick={(e) => {
              e.stopPropagation();
              toggleFolder(node.id);
            }}
          >
            <div className="w-4 flex justify-center text-slate-400">
              {node.isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </div>
            <Folder size={14} className="text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider truncate">{node.name}</span>
          </div>
          {node.isOpen && node.children && (
            <div>{node.children.map(child => renderNode(child, depth + 1))}</div>
          )}
        </div>
      );
    } else {
      if (searchQuery && !node.name.toLowerCase().includes(searchQuery.toLowerCase())) return null;
      
      // Determine if active (we check if activeTabId matches this class' tab path roughly, or just check URL)
      // For now we just keep it simple
      return (
        <div 
          key={node.id}
          className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-slate-600 dark:text-slate-400 transition-colors group"
          style={{ paddingLeft: `${depth * 12 + 24}px` }}
          onClick={() => handleClassClick(node.classData!.id)}
        >
          <FileText size={14} className="text-slate-400 group-hover:text-blue-500 transition-colors" />
          <span className="text-[13px] truncate">{node.name}</span>
        </div>
      );
    }
  };

  return (
    <div 
      className="h-full bg-slate-50/50 dark:bg-slate-900/50 border-r border-slate-200 dark:border-slate-800 flex flex-col relative group/pane"
      style={{ width }}
    >
      {/* Resizer Handle */}
      <div
        className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-blue-500 hover:w-1.5 transition-all z-50"
        onMouseDown={startResizing}
      />

      <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between group">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500">Explorateur</h2>
        <button 
          onClick={() => setShowCreateClassModal(true)}
          className="text-slate-400 hover:text-blue-500 opacity-0 group-hover:opacity-100 transition-all p-1 hover:bg-slate-200 dark:hover:bg-slate-800 rounded"
          title="Créer une nouvelle classe"
        >
          <Plus size={14} />
        </button>
      </div>

      <div className="p-2">
        <div className="relative group">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={12} />
          <input
            type="text"
            placeholder="Rechercher..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 outline-none transition-all shadow-sm"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-2 hide-scrollbar">
        {loading ? (
          <div className="text-center p-4 text-slate-400 text-xs">Chargement...</div>
        ) : nodes.length === 0 ? (
          <div className="text-center p-4 text-slate-400 text-xs">Aucune classe trouvée.</div>
        ) : (
          nodes.map(node => renderNode(node))
        )}
      </div>

      {showCreateClassModal && (
        <EditClassModal 
          onClose={() => setShowCreateClassModal(false)}
          onSuccess={() => {
            loadClasses();
          }}
        />
      )}
    </div>
  );
}
