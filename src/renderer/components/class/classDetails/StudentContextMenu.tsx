import React from 'react';
import { Edit, FileText, Trash2, TrendingUp } from '../../iconsSvg';
import { Student } from '../../../services/studentService';

interface StudentContextMenuProps {
  contextMenu: { x: number; y: number; student: Student };
  onClose: () => void;
  onEditStudent: (studentId: number) => void;
  onOpenBulletin: (studentId: number) => void;
  onOpenRepechage: (studentId: number) => void;
  onDeleteStudent: () => void;
}

export default function StudentContextMenu({
  contextMenu,
  onClose,
  onEditStudent,
  onOpenBulletin,
  onOpenRepechage,
  onDeleteStudent
}: StudentContextMenuProps) {
  return (
    <div
      className="fixed bg-white dark:bg-slate-800 shadow-lg dark:shadow-2xl rounded-lg py-1 z-50 border border-slate-200 dark:border-slate-700 min-w-40px"
      style={{ top: contextMenu.y, left: contextMenu.x }}
    >
      <button
        onClick={() => {
          onEditStudent(contextMenu.student.id);
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
      >
        <Edit size={16} />
        Éditer l'élève
      </button>
      <button
        onClick={() => {
          onOpenBulletin(contextMenu.student.id);
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
      >
        <FileText size={16} />
        Voir le bulletin
      </button>
      <button
        onClick={() => {
          onOpenRepechage(contextMenu.student.id);
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 flex items-center gap-2"
      >
        <TrendingUp size={16} />
        Gérer le repêchage
      </button>
      <div className="h-px bg-slate-100 dark:bg-slate-700 my-1"></div>
      <button
        onClick={() => {
          onDeleteStudent();
          onClose();
        }}
        className="w-full text-left px-4 py-2 hover:bg-red-50 dark:hover:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center gap-2"
      >
        <Trash2 size={16} />
        Supprimer
      </button>
    </div>
  );
}
