import React, { useState, useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar'; // C'est maintenant ActivityBar
import ExplorerPane from './ExplorerPane';
import TabBar from './TabBar';
import SplitView from './SplitView';
import { useWorkbench } from './WorkbenchProvider';
import { documentRegistry } from './documentRegistry';
import { undoRedoService } from '../services/undoRedoService';
import { useDragState } from './dragManager';
import { macroService } from '../services/macroService';

function DragGhost() {
  const { isDragging, currentX, currentY, item } = useDragState();
  if (!isDragging || !item) return null;

  return (
    <div 
      className="fixed pointer-events-none z-[9999] bg-blue-500/90 text-white px-3 py-1.5 rounded shadow-lg text-sm font-medium flex items-center gap-2 transform -translate-x-1/2 -translate-y-1/2 opacity-80"
      style={{ left: currentX, top: currentY }}
    >
      <span className="w-4 h-4 opacity-50">☰</span>
      {item.data?.title || item.id}
    </div>
  );
}

function PanelContent({ panel }: { panel: any }) {
  const doc = documentRegistry.get(panel.type);
  if (!doc || !doc.component) {
    return <div className="p-8 text-center text-slate-500">Composant non trouvé pour le type: {panel.type}</div>;
  }
  const Component = doc.component;
  return <Component {...panel.props} onClose={() => {}} />; // On ignore le onClose natif puisqu'on le ferme via l'onglet
}

export default function WorkbenchShell() {
  const [activeView, setActiveView] = useState<string | null>('explorer');
  const [explorerWidth, setExplorerWidth] = useState(240);
  const [statusMessage, setStatusMessage] = useState('Prêt');
  const [isRecordingMacro, setIsRecordingMacro] = useState(macroService.isCurrentlyRecording());
  const location = useLocation();
  const isSettings = location.pathname === '/settings';
  
  const { panels, activePanelId, closePanel } = useWorkbench();

  // Écoute des raccourcis claviers globaux pour Undo/Redo
  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // Ignore if typing in an input or textarea
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.ctrlKey && e.key === 'z') {
        e.preventDefault();
        const success = await undoRedoService.undo();
        if (success) {
          setStatusMessage('Dernière action annulée (Undo)');
          setTimeout(() => setStatusMessage('Prêt'), 3000);
        } else {
          setStatusMessage('Rien à annuler');
          setTimeout(() => setStatusMessage('Prêt'), 3000);
        }
      }
      if (e.ctrlKey && e.key === 'y') {
        e.preventDefault();
        const success = await undoRedoService.redo();
        if (success) {
          setStatusMessage('Action rétablie (Redo)');
          setTimeout(() => setStatusMessage('Prêt'), 3000);
        } else {
          setStatusMessage('Rien à rétablir');
          setTimeout(() => setStatusMessage('Prêt'), 3000);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    const handleStart = () => setIsRecordingMacro(true);
    const handleStop = () => setIsRecordingMacro(false);
    window.addEventListener('macro:recordingStart', handleStart);
    window.addEventListener('macro:recordingStop', handleStop);
    return () => {
      window.removeEventListener('macro:recordingStart', handleStart);
      window.removeEventListener('macro:recordingStop', handleStop);
    };
  }, []);

  const activePanel = panels.find(p => p.id === activePanelId) || panels[panels.length - 1];

  const primaryContent = (
    <div className="flex-1 flex flex-col min-w-0 h-full relative">
      <TabBar />
      <div className="flex-1 overflow-auto relative">
        <Outlet />
      </div>
    </div>
  );

  const secondaryContent = activePanel ? (
    <div className="flex flex-col h-full w-full bg-white relative">
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-200 bg-slate-50 shrink-0">
        <span className="font-semibold text-slate-700">{activePanel.title}</span>
        <button onClick={() => closePanel(activePanel.id)} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-colors">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </div>
      <div className="flex-1 overflow-auto relative bg-slate-100">
         <PanelContent panel={activePanel} />
      </div>
    </div>
  ) : null;

  return (
    <div className="flex bg-white h-screen overflow-hidden">
      {!isSettings && (
        <>
          <Sidebar 
            activeView={activeView} 
            onToggleView={(view) => setActiveView(v => v === view ? null : view)} 
          />
          {activeView === 'explorer' && (
            <ExplorerPane width={explorerWidth} setWidth={setExplorerWidth} />
          )}
        </>
      )}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <SplitView 
          left={primaryContent} 
          right={secondaryContent} 
          showRight={panels.length > 0} 
          initialLeftWidth={800}
        />
        {/* Status Bar */}
        <div className="h-6 bg-blue-600 text-white flex items-center px-3 text-xs shrink-0 select-none">
          <div className="flex-1 flex items-center gap-4">
            <span>{statusMessage}</span>
            {isRecordingMacro && (
              <div className="flex items-center gap-2 bg-red-500/20 px-2 py-0.5 rounded border border-red-400/30">
                <div className="w-2 h-2 rounded-full bg-red-400 animate-pulse" />
                <span className="text-red-100 font-medium">Enregistrement Macro...</span>
                <button 
                  onClick={() => macroService.stopRecording(`Macro ${new Date().toLocaleTimeString()}`)}
                  className="ml-2 hover:bg-red-500/40 px-1.5 rounded transition-colors"
                >
                  Arrêter
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4 text-blue-100">
            <span>Schoolab Workbench</span>
          </div>
        </div>
        <DragGhost />
      </main>
    </div>
  );
}
