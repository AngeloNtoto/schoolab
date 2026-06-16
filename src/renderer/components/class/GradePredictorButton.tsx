import React from 'react';
import { Sparkles } from '../iconsSvg';

interface GradePredictorButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export const GradePredictorButton: React.FC<GradePredictorButtonProps> = ({
  onClick,
  disabled = false
}) => {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 px-2 py-1.5 rounded text-[11px] font-medium text-slate-700 hover:text-blue-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:text-blue-400 dark:hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:pointer-events-none"
      title="Prédire les notes manquantes"
    >
      <Sparkles size={14} />
      <span>Prédire</span>
    </button>
  );
};
