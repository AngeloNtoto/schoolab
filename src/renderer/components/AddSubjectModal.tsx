import React, { useState } from 'react';
import { X, BookOpen, Plus, Trash2 } from 'lucide-react';

interface Subject {
  id: number;
  name: string;
  code: string;
  max_score: number;
}

interface AddSubjectModalProps {
  classId: number;
  subjects: Subject[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddSubjectModal({ classId, subjects, onClose, onSuccess }: AddSubjectModalProps) {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [maxScore, setMaxScore] = useState('20');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      await window.api.db.execute(
        'INSERT INTO subjects (name, code, max_score, class_id) VALUES (?, ?, ?, ?)',
        [name, code, Number(maxScore), classId]
      );
      setName('');
      setCode('');
      setMaxScore('20');
      onSuccess();
    } catch (error) {
      console.error('Failed to add subject:', error);
      alert('Erreur lors de l\'ajout de la matière');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (subjectId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette matière ? Toutes les notes associées seront perdues.')) return;

    try {
      await window.api.db.execute('DELETE FROM subjects WHERE id = ?', [subjectId]);
      onSuccess();
    } catch (error) {
      console.error('Failed to delete subject:', error);
      alert('Erreur lors de la suppression');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-lg">
              <BookOpen className="text-blue-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">Gérer les Matières</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="flex-1 overflow-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Add Form */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
                <Plus size={18} />
                Nouvelle Matière
              </h3>
              <form onSubmit={handleSubmit} className="space-y-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Nom de la matière <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="Ex: Mathématiques"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Code
                    </label>
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Ex: MATH"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Max. Points
                    </label>
                    <input
                      type="number"
                      value={maxScore}
                      onChange={(e) => setMaxScore(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                      min="1"
                      required
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors disabled:opacity-50"
                >
                  {loading ? 'Ajout...' : 'Ajouter la matière'}
                </button>
              </form>
            </div>

            {/* List */}
            <div>
              <h3 className="font-semibold text-slate-800 mb-4">Matières existantes ({subjects.length})</h3>
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2">
                {subjects.length === 0 ? (
                  <p className="text-sm text-slate-500 italic">Aucune matière configurée.</p>
                ) : (
                  subjects.map(subject => (
                    <div key={subject.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg hover:border-blue-300 transition-colors group">
                      <div>
                        <p className="font-medium text-slate-800">{subject.name}</p>
                        <p className="text-xs text-slate-500">
                          Code: {subject.code || '-'} • Max: {subject.max_score}
                        </p>
                      </div>
                      <button
                        onClick={() => handleDelete(subject.id)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        title="Supprimer"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
