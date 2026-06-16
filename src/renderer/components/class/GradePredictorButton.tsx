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
      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition font-black text-[9px] uppercase tracking-widest border border-transparent"
      title="Prédire les notes manquantes"
    >
      <Sparkles size={14} />
      <span>Prédire</span>
    </button>
  );
};
