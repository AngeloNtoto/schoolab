import React from 'react';
import { Loader2 } from 'lucide-react';

interface ProfessionalLoaderProps {
  message?: string;
  subMessage?: string;
}

export default function ProfessionalLoader({ 
  message = "Chargement en cours...", 
  subMessage = "Veuillez patienter quelques instants" 
}: ProfessionalLoaderProps) {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-white/80 backdrop-blur-md transition-all duration-500">
      <div className="relative flex flex-col items-center">
        {/* Logo Container with Pulse Effect */}
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-blue-500 rounded-full opacity-20 animate-ping"></div>
          <div className="relative bg-white p-4 rounded-full shadow-xl border border-blue-100">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" strokeWidth={1.5} />
          </div>
        </div>

        {/* Text Content */}
        <div className="text-center space-y-2 animate-pulse">
          <h3 className="text-xl font-semibold text-slate-800 tracking-tight">
            {message}
          </h3>
          <p className="text-sm text-slate-500 font-medium">
            {subMessage}
          </p>
        </div>

        {/* Progress Bar Animation */}
        <div className="mt-8 w-48 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-[loading_1.5s_ease-in-out_infinite] w-1/2 rounded-full"></div>
        </div>
      </div>

      <style>{`
        @keyframes loading {
          0% { transform: translateX(-100%); }
          50% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
