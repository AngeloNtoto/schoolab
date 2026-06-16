import React, { useState, useEffect } from 'react';
import { macroService, Macro } from '../services/macroService';
import { useWorkbench } from './WorkbenchProvider';
import { commandRegistry } from './commandRegistry';

export default function MacrosManager({ onClose }: { onClose: () => void }) {
  const [macros, setMacros] = useState<Macro[]>([]);
  const { executeCommand } = useWorkbench();

  useEffect(() => {
    // Refresh macros periodically or when component mounts
    const load = () => {
      setMacros(macroService.getMacros());
    };
    load();
    const interval = setInterval(load, 1000);
    return () => clearInterval(interval);
  }, []);

  const handlePlay = async (macro: Macro) => {
    const isDestructive = macro.actions.some(action => {
      const cmd = commandRegistry.getCommand(action.commandId);
      return cmd?.isDestructive;
    });

    if (isDestructive) {
      const confirmed = window.confirm(`Attention : La macro "${macro.name}" contient des actions potentiellement destructives (ex: suppression).\n\nVoulez-vous vraiment l'exécuter ?`);
      if (!confirmed) return;
    }

    try {
      await macroService.playMacro(macro.id);
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: `Macro '${macro.name}' exécutée`, type: 'success' } }));
    } catch (e) {
      console.error(e);
      window.dispatchEvent(new CustomEvent('toast', { detail: { message: 'Erreur lors de l\'exécution de la macro', type: 'error' } }));
    }
  };


  const handleDelete = (id: string) => {
    macroService.deleteMacro(id);
    setMacros(macroService.getMacros());
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center justify-between">
        Gestionnaire de Macros
        <button 
          onClick={() => executeCommand('macro.action.startRecording')}
          className="text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg font-medium transition-colors"
        >
          Nouvel enregistrement
        </button>
      </h2>

      {macros.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl text-slate-500">
          <p>Aucune macro enregistrée.</p>
          <p className="text-sm mt-2">Démarrez un enregistrement pour automatiser vos actions répétitives.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {macros.map(macro => {
            const isDestructive = macro.actions.some(action => {
              const cmd = commandRegistry.getCommand(action.commandId);
              return cmd?.isDestructive;
            });
            return (
            <div key={macro.id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group hover:border-blue-300 transition-colors">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-slate-800">{macro.name}</h3>
                  {isDestructive && (
                    <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Destructive</span>
                  )}
                </div>
                <p className="text-xs text-slate-500 mt-1">{macro.actions.length} action(s)</p>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <button 
                  onClick={() => handlePlay(macro)}
                  className="px-3 py-1.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-700 rounded text-sm font-medium transition-colors flex items-center gap-1"
                  title="Exécuter"
                >
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" /></svg>
                  Play
                </button>
                <button 
                  onClick={() => handleDelete(macro.id)}
                  className="px-2 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded transition-colors"
                  title="Supprimer"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                </button>
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
