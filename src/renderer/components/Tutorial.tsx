import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ChevronRight } from 'lucide-react';

interface TutorialStep {
  title: string;
  content: string;
  target?: string;
}

interface TutorialProps {
  pageId: string;
  steps: TutorialStep[];
  onComplete: () => void;
}

export default function Tutorial({ pageId, steps, onComplete }: TutorialProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [show, setShow] = useState(false);

  useEffect(() => {
    const visited = localStorage.getItem(`tutorial_${pageId}`);
    if (!visited) {
      setShow(true);
    }
  }, [pageId]);

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = () => {
    localStorage.setItem(`tutorial_${pageId}`, 'true');
    setShow(false);
    onComplete();
  };

  const handleSkip = () => {
    localStorage.setItem(`tutorial_${pageId}`, 'true');
    setShow(false);
  };

  if (!show) return null;

  const step = steps[currentStep];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl animate-in slide-in-from-bottom-4 duration-300">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-6 rounded-t-2xl text-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Lightbulb size={28} />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Guide rapide</h2>
                <p className="text-blue-100 text-sm mt-1">
                  Étape {currentStep + 1} sur {steps.length}
                </p>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8">
          <h3 className="text-2xl font-bold text-slate-800 mb-4">{step.title}</h3>
          <div className="text-slate-600 leading-relaxed whitespace-pre-line">
            {step.content}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <div className="flex items-center justify-between">
            {/* Progress dots */}
            <div className="flex gap-2">
              {steps.map((_, idx) => (
                <div
                  key={idx}
                  className={`h-2 rounded-full transition-all ${
                    idx === currentStep
                      ? 'w-8 bg-blue-600'
                      : idx < currentStep
                      ? 'w-2 bg-blue-400'
                      : 'w-2 bg-slate-300'
                  }`}
                />
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSkip}
                className="px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors"
              >
                Passer
              </button>
              <button
                onClick={handleNext}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                {currentStep < steps.length - 1 ? (
                  <>
                    Suivant
                    <ChevronRight size={18} />
                  </>
                ) : (
                  'Terminer'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
