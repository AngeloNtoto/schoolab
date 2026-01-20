'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle } from '../iconsSvg';
import { updateService, UpdateProgress } from '../../services/updateService';

/**
 * Widget de mise à jour discret dans le coin de l'écran
 * N'interrompt pas l'utilisateur - il peut continuer à travailler
 */
export default function UpdateModal() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress>({
    status: '',
    percent: 0,
    downloading: false,
    available: false
  });

  // Vérification automatique au montage
  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    const result = await updateService.checkForUpdates(true, setProgress);
    if (result.available) {
      setIsVisible(true);
      
      // Si la mise à jour date de plus de 2 jours, on force l'installation
      if (updateService.shouldForceUpdate()) {
        console.log('[Updater] Mise à jour forcée (plus de 2 jours)');
        handleInstall();
      }
    }
  };

  const handleInstall = async () => {
    setIsMinimized(false);
    await updateService.downloadAndInstall(setProgress);
  };

  const handleClose = () => {
    if (!progress.downloading) {
      setIsVisible(false);
    }
  };

  const handleMinimize = () => {
    setIsMinimized(true);
  };

  if (!isVisible) return null;

  // Version minimisée (juste un petit indicateur)
  if (isMinimized && !progress.downloading) {
    return (
      <button
        onClick={() => setIsMinimized(false)}
        className="fixed bottom-4 right-4 z-[150] p-3 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 transition-all hover:scale-110 active:scale-95 animate-in slide-in-from-bottom-4 duration-300"
        title="Mise à jour disponible"
      >
        <Download size={20} />
        <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
      </button>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 z-[150] w-80 animate-in slide-in-from-bottom-4 slide-in-from-right-4 duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-indigo-500 to-purple-500">
          <div className="flex items-center gap-2 text-white">
            {progress.downloading ? (
              <RefreshCw size={16} className="animate-spin" />
            ) : progress.percent === 100 ? (
              <CheckCircle size={16} />
            ) : (
              <Download size={16} />
            )}
            <span className="font-bold text-sm">
              {progress.downloading ? 'Téléchargement...' : 'Mise à jour'}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {!progress.downloading && (
              <button
                onClick={handleMinimize}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
                title="Réduire"
              >
                <span className="text-xs font-bold">—</span>
              </button>
            )}
            {!progress.downloading && (
              <button
                onClick={handleClose}
                className="p-1.5 hover:bg-white/20 rounded-lg transition-colors text-white/80 hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-4">
          {/* Version badge */}
          {progress.version && (
            <div className="mb-3">
              <span className="inline-flex items-center px-2.5 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-xs font-bold">
                v{progress.version}
              </span>
            </div>
          )}

          {/* Status */}
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-3">
            {progress.status}
          </p>

          {/* Progress bar */}
          {progress.downloading && (
            <div className="mb-3">
              <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-right text-xs font-bold text-slate-500 mt-1">
                {progress.percent}%
              </p>
            </div>
          )}

          {/* Actions */}
          {!progress.downloading && progress.percent !== 100 && (
            <div className="flex gap-2">
              <button
                onClick={handleMinimize}
                className="flex-1 px-3 py-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-bold rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all"
              >
                Plus tard
              </button>
              <button
                onClick={handleInstall}
                className="flex-1 px-3 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl hover:bg-indigo-700 transition-all"
              >
                Installer
              </button>
            </div>
          )}

          {/* Warning during download */}
          {progress.downloading && (
            <p className="text-xs text-amber-600 dark:text-amber-400 text-center">
              ⚠️ Ne fermez pas l'app
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
