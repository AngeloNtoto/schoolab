import React, { useState, useEffect } from 'react';
import { dbService } from '../../services/databaseService';
import { useToast } from '../../context/ToastContext';
import { Copy, Search } from '../iconsSvg';
import { getClassDisplayName } from '../../lib/classUtils';

interface CloneSubjectsProps {
  classId: number;
  onSuccess: () => void;
}

interface ClassOption {
  id: number;
  level: string;
  option: string;
  section: string;
  name: string;
  subject_count: number;
}

export default function CloneSubjects({ classId, onSuccess }: CloneSubjectsProps) {
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [cloning, setCloning] = useState(false);
  const toast = useToast();

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      // Get all classes except current one, and count their subjects
      const data = await dbService.query<ClassOption>(`
        SELECT c.id, c.level, c.option, c.section, c.name, COUNT(s.id) as subject_count
        FROM classes c
        LEFT JOIN subjects s ON s.class_id = c.id
        WHERE c.id != ?
        GROUP BY c.id
        HAVING subject_count > 0
        ORDER BY c.level ASC, c.option ASC, c.section ASC
      `, [classId]);
      
      setClasses(data);
    } catch (error) {
      console.error('Failed to load classes for cloning:', error);
      toast.error('Erreur lors du chargement des classes');
    } finally {
      setLoading(false);
    }
  };

  const handleClone = async (sourceClassId: number) => {
    setCloning(true);
    try {
      // 1. Get subjects from source class
      const sourceSubjects = await dbService.query<any>(
        'SELECT * FROM subjects WHERE class_id = ? ORDER BY display_order ASC', 
        [sourceClassId]
      );

      if (sourceSubjects.length === 0) {
        toast.error('Aucun cours à cloner');
        return;
      }

      // 2. Get current max display order
      const maxOrderResult = await dbService.query<{ max_order: number | null }>(
        'SELECT MAX(display_order) as max_order FROM subjects WHERE class_id = ?', 
        [classId]
      );
      let currentOrder = (maxOrderResult[0]?.max_order ?? -1) + 1;

      // 3. Check existing subjects to avoid duplicates
      const existingSubjects = await dbService.query<{ name: string }>(
        'SELECT name FROM subjects WHERE class_id = ?', 
        [classId]
      );
      const existingNames = new Set(existingSubjects.map(s => s.name.toLowerCase()));

      let addedCount = 0;

      // 4. Insert new subjects
      for (const subject of sourceSubjects) {
        if (existingNames.has(subject.name.toLowerCase())) continue;

        await dbService.execute(
          `INSERT INTO subjects (name, code, sub_domain, max_p1, max_p2, max_exam1, max_p3, max_p4, max_exam2, class_id, domain_id, display_order, is_dirty)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
          [
            subject.name, subject.code, subject.sub_domain || '', 
            subject.max_p1, subject.max_p2, subject.max_exam1, 
            subject.max_p3, subject.max_p4, subject.max_exam2, 
            classId, subject.domain_id, currentOrder
          ]
        );
        currentOrder++;
        addedCount++;
      }

      toast.success(`${addedCount} cours cloné${addedCount > 1 ? 's' : ''} avec succès`);
      onSuccess();
    } catch (error) {
      console.error('Erreur lors du clonage:', error);
      toast.error('Erreur lors du clonage des cours');
    } finally {
      setCloning(false);
    }
  };

  const filteredClasses = classes.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.level.toLowerCase().includes(search.toLowerCase()) || 
    c.option.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 px-1">
          <div className="w-1.5 h-1.5 rounded-full bg-blue-600"></div>
          <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em]">
            Cloner depuis une autre classe
          </h3>
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Rechercher une classe..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-1.5 text-xs bg-slate-100 dark:bg-slate-800 border-none rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700 dark:text-slate-300 w-48 transition-all"
          />
        </div>
      </div>

      <div className="bg-slate-50 dark:bg-slate-900/30 rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-slate-400 text-sm">Chargement des classes...</div>
        ) : filteredClasses.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">
            {search ? 'Aucune classe ne correspond à votre recherche.' : 'Aucune autre classe avec des cours n\'a été trouvée.'}
          </div>
        ) : (
          <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
            {filteredClasses.map(c => (
              <div 
                key={c.id} 
                className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-white/5 last:border-b-0 hover:bg-white dark:hover:bg-slate-800/50 transition-colors group"
              >
                <div>
                  <h4 className="font-bold text-slate-800 dark:text-slate-200">{c.name || getClassDisplayName(c.level, c.option, c.section)}</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">
                    {c.subject_count} matière{c.subject_count > 1 ? 's' : ''} configurée{c.subject_count > 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={() => handleClone(c.id)}
                  disabled={cloning}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-600 hover:text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50"
                >
                  <Copy size={14} />
                  Copier
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
