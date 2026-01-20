'use client';

import React, { useState, useEffect } from 'react';
import { Download, X, RefreshCw, CheckCircle, AlertCircle } from '../iconsSvg';
import { updateService, UpdateProgress } from '../../services/updateService';

/**
 * Modal de mise à jour avec barre de progression
 * Affiche l'état du téléchargement et de l'installation
 */
export default function UpdateModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [progress, setProgress] = useState<UpdateProgress>({
    status: '',
    percent: 0,
    downloading: false,
    available: false
  });
  const [checking, setChecking] = useState(false);

  // Vérification automatique au montage
  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    setChecking(true);
    const result = await updateService.checkForUpdates(true, setProgress);
    setChecking(false);
    
    if (result.available) {
      setIsOpen(true);
    }
  };

  const handleInstall = async () => {
    await updateService.downloadAndInstall(setProgress);
  };

  const handleClose = () => {
    if (!progress.downloading) {
      setIsOpen(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl max-w-md w-full animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 overflow-hidden">
        {/* Close button */}
        {!progress.downloading && (
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all z-10"
          >
            <X size={18} />
          </button>
        )}

        {/* Header gradient */}
        <div className="h-2 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500" />

        <div className="p-6 pt-8">
          {/* Icon */}
          <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 transition-all ${
            progress.downloading 
              ? 'bg-blue-100 dark:bg-blue-900/30' 
              : progress.percent === 100 
                ? 'bg-green-100 dark:bg-green-900/30'
                : 'bg-indigo-100 dark:bg-indigo-900/30'
          }`}>
            {progress.downloading ? (
              <Download size={40} className="text-blue-600 dark:text-blue-400 animate-bounce" />
            ) : progress.percent === 100 ? (
              <CheckCircle size={40} className="text-green-600 dark:text-green-400" />
            ) : (
              <RefreshCw size={40} className="text-indigo-600 dark:text-indigo-400" />
            )}
          </div>

          {/* Title */}
          <h2 className="text-2xl font-black text-slate-900 dark:text-white text-center mb-2">
            {progress.downloading 
              ? 'Mise à jour en cours...' 
              : progress.percent === 100 
                ? 'Installation terminée'
                : 'Mise à jour disponible'}
          </h2>

          {/* Version */}
          {progress.version && (
            <p className="text-center mb-4">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-bold">
                Version {progress.version}
              </span>
            </p>
          )}

          {/* Status */}
          <p className="text-slate-600 dark:text-slate-400 text-center text-sm mb-6">
            {progress.status}
          </p>

          {/* Progress bar */}
          {progress.downloading && (
            <div className="mb-6">
              <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
              <p className="text-center text-xs font-bold text-slate-500 dark:text-slate-400 mt-2">
                {progress.percent}%
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        {!progress.downloading && progress.percent !== 100 && (
          <div className="flex gap-3 p-6 pt-0">
            <button
              onClick={handleClose}
              className="flex-1 px-6 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold rounded-2xl hover:bg-slate-200 dark:hover:bg-slate-700 transition-all active:scale-[0.98]"
            >
              Plus tard
            </button>
            <button
              onClick={handleInstall}
              className="flex-1 px-6 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold rounded-2xl hover:from-blue-700 hover:to-indigo-700 transition-all active:scale-[0.98] shadow-lg shadow-blue-500/25"
            >
              Installer maintenant
            </button>
          </div>
        )}

        {/* Downloading indicator */}
        {progress.downloading && (
          <div className="p-6 pt-0">
            <p className="text-center text-xs text-slate-400 dark:text-slate-500">
              ⚠️ Ne fermez pas l'application pendant la mise à jour
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
