import React, { useState, useEffect } from 'react';
import { X, School, Save } from 'lucide-react';

interface Class {
  id: number;
  name: string;
  level: string;
  option: string;
  section: string;
}

interface EditClassModalProps {
  classData?: Class | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditClassModal({ classData, onClose, onSuccess }: EditClassModalProps) {
  const [name, setName] = useState(classData?.name || '');
  const [level, setLevel] = useState(classData?.level || '');
  const [option, setOption] = useState(classData?.option || '');
  const [section, setSection] = useState(classData?.section || '');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (classData) {
        await window.api.db.execute(
          'UPDATE classes SET name = ?, level = ?, option = ?, section = ? WHERE id = ?',
          [name, level, option, section, classData.id]
        );
      } else {
        await window.api.db.execute(
          'INSERT INTO classes (name, level, option, section) VALUES (?, ?, ?, ?)',
          [name, level, option, section]
        );
      }
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to update class:', error);
      alert('Erreur lors de la modification de la classe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md animate-in fade-in zoom-in duration-200">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <School className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">
              {classData ? 'Modifier la classe' : 'Nouvelle classe'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Nom de la classe
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Niveau
              </label>
              <input
                type="text"
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Section
              </label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Option
            </label>
            <input
              type="text"
              value={option}
              onChange={(e) => setOption(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              required
            />
          </div>

          <div className="pt-4 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-700 hover:bg-slate-100 rounded-lg font-medium transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              <Save size={18} />
              {loading ? 'Enregistrement...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
