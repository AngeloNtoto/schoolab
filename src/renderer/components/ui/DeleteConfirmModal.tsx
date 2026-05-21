import React, { useState } from 'react';
import { Trash2, X } from '../iconsSvg';

interface DeleteConfirmModalProps {
  title: string;
  message: string;
  itemName?: string;
  onConfirm: () => void;
  onCancel: () => void;
  isOpen: boolean;
}

export default function DeleteConfirmModal({ 
  title, 
  message, 
  itemName, 
  onConfirm, 
  onCancel ,
  isOpen
}: DeleteConfirmModalProps) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-lg">
              <Trash2 className="text-red-600" size={24} />
            </div>
            <h2 className="text-xl font-bold text-slate-800">{title}</h2>
          </div>
          <button
            onClick={onCancel}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X size={20} className="text-slate-500" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-slate-600 mb-4">{message}</p>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-800 font-medium">
              Élément à supprimer : <span className="font-bold">{itemName}</span>
            </p>
          </div>
          <p className="text-sm text-slate-500 mt-4">
            ⚠️ Cette action est irréversible !
          </p>
        </div>

        <div className="flex gap-3 p-6 bg-slate-50 border-t border-slate-200">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 border border-slate-300 text-slate-700 rounded-lg hover:bg-white font-medium transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Suppression...
              </>
            ) : (
              <>
                <Trash2 size={18} />
                Supprimer
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
