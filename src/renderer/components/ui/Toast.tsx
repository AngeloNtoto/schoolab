import React, { useEffect } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from '../iconsSvg';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastProps {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  onDismiss: (id: string) => void;
}

const icons = {
  success: <CheckCircle className="w-5 h-5 text-green-500" />,
  error: <AlertCircle className="w-5 h-5 text-red-500" />,
  warning: <AlertTriangle className="w-5 h-5 text-amber-500" />,
  info: <Info className="w-5 h-5 text-blue-500" />,
};

const styles = {
  success: 'bg-white border-green-200 text-slate-800',
  error: 'bg-white border-red-200 text-slate-800',
  warning: 'bg-white border-amber-200 text-slate-800',
  info: 'bg-white border-blue-200 text-slate-800',
};

export default function Toast({ id, type, message, duration = 5000, onDismiss }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(id);
    }, duration);

    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <div className={`flex items-start gap-3 p-4 rounded-xl shadow-lg border animate-in slide-in-from-right-full duration-300 max-w-sm w-full pointer-events-auto ${styles[type]}`}>
      <div className="flex-shrink-0 mt-0.5">
        {icons[type]}
      </div>
      <div className="flex-1 text-sm font-medium leading-relaxed">
        {message}
      </div>
      <button 
        onClick={() => onDismiss(id)}
        className="flex-shrink-0 text-slate-400 hover:text-slate-600 transition-colors"
      >
        <X size={16} />
      </button>
    </div>
  );
}
