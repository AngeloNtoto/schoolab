import React, { useState, useEffect } from 'react';
import { X, Lightbulb, ChevronRight, ChevronLeft, Sparkles, BookOpen } from 'lucide-react';
import { useTutorial } from '../context/TutorialContext';

/**
 * TutorialModal - Modal de tutoriel globale
 * 
 * Ce composant s'affiche automatiquement lorsqu'un tutoriel est déclenché
 * via le TutorialContext. Il gère la navigation entre les étapes et
 * sauvegarde la progression dans localStorage.
 */
export default function TutorialModal() {
  const { currentTutorial, isVisible, hideTutorial } = useTutorial();
  const [currentStep, setCurrentStep] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Reset step when tutorial changes
  useEffect(() => {
    if (currentTutorial) {
      setCurrentStep(0);
    }
  }, [currentTutorial?.pageId]);

  if (!isVisible || !currentTutorial) return null;

  const step = currentTutorial.steps[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === currentTutorial.steps.length - 1;

  const handleNext = () => {
    if (isAnimating) return;
    
    if (isLastStep) {
      hideTutorial();
    } else {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentStep(prev => prev + 1);
        setIsAnimating(false);
      }, 150);
    }
  };

  const handlePrevious = () => {
    if (isAnimating || isFirstStep) return;
    
    setIsAnimating(true);
    setTimeout(() => {
      setCurrentStep(prev => prev - 1);
      setIsAnimating(false);
    }, 150);
  };

  const handleSkip = () => {
    hideTutorial();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 animate-in fade-in duration-300">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg animate-in slide-in-from-bottom-4 zoom-in-95 duration-300 overflow-hidden">
        {/* Header avec gradient */}
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 p-6 text-white relative overflow-hidden">
          {/* Background decoration */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
          <div className="absolute bottom-0 left-0 w-24 h-24 bg-white/5 rounded-full translate-y-1/2 -translate-x-1/2" />
          
          <div className="flex items-center justify-between relative">
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-sm shadow-lg">
                <BookOpen size={28} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-200" />
                  <span className="text-blue-200 text-xs font-semibold uppercase tracking-wider">Guide</span>
                </div>
                <h2 className="text-xl font-bold">{currentTutorial.title}</h2>
              </div>
            </div>
            <button
              onClick={handleSkip}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              title="Fermer"
            >
              <X size={24} />
            </button>
          </div>

          {/* Progress bar */}
          <div className="mt-6 flex items-center gap-2">
            <span className="text-sm font-medium text-blue-200">
              {currentStep + 1} / {currentTutorial.steps.length}
            </span>
            <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
              <div 
                className="h-full bg-white rounded-full transition-all duration-300"
                style={{ width: `${((currentStep + 1) / currentTutorial.steps.length) * 100}%` }}
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className={`p-8 transition-opacity duration-150 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
          <div className="flex items-start gap-4 mb-4">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-600 flex-shrink-0">
              <Lightbulb size={20} />
            </div>
            <h3 className="text-xl font-bold text-slate-800 pt-1">{step.title}</h3>
          </div>
          <p className="text-slate-600 leading-relaxed pl-12 whitespace-pre-line">
            {step.content}
          </p>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          {/* Navigation dots */}
          <div className="flex gap-2">
            {currentTutorial.steps.map((_, idx) => (
              <button
                key={idx}
                onClick={() => !isAnimating && setCurrentStep(idx)}
                className={`h-2.5 rounded-full transition-all cursor-pointer hover:opacity-80 ${
                  idx === currentStep
                    ? 'w-8 bg-blue-600'
                    : idx < currentStep
                    ? 'w-2.5 bg-blue-300'
                    : 'w-2.5 bg-slate-300'
                }`}
              />
            ))}
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3">
            {!isFirstStep && (
              <button
                onClick={handlePrevious}
                className="flex items-center gap-1 px-4 py-2 text-slate-600 hover:text-slate-800 font-medium transition-colors hover:bg-slate-100 rounded-lg"
              >
                <ChevronLeft size={18} />
                Précédent
              </button>
            )}
            
            <button
              onClick={handleSkip}
              className="px-4 py-2 text-slate-500 hover:text-slate-700 font-medium transition-colors"
            >
              Passer
            </button>
            
            <button
              onClick={handleNext}
              className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
            >
              {isLastStep ? (
                <>
                  Compris !
                  <Sparkles size={16} />
                </>
              ) : (
                <>
                  Suivant
                  <ChevronRight size={18} />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
