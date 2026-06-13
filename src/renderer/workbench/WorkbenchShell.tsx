import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/layout/Sidebar';
import TabBar from './TabBar';
import SplitView from './SplitView';
import { useWorkbench } from './WorkbenchProvider';
import { documentRegistry } from './documentRegistry';

function PanelContent({ panel }: { panel: any }) {
  const doc = documentRegistry.get(panel.type);
  if (!doc || !doc.component) {
    return <div className="p-8 text-center text-slate-500">Composant non trouvé pour le type: {panel.type}</div>;
  }
  const Component = doc.component;
  return <Component {...panel.props} onClose={() => {}} />; // On ignore le onClose natif puisqu'on le ferme via l'onglet
}

export default function WorkbenchShell() {
  const [sidebarWidth, setSidebarWidth] = useState(250);
  const location = useLocation();
  const isSettings = location.pathname === '/settings';
  
  const { panels, activePanelId, closePanel } = useWorkbench();

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
      {!isSettings && <Sidebar width={sidebarWidth} setWidth={setSidebarWidth} />}
      <main className="flex-1 flex flex-col min-w-0 relative">
        <SplitView 
          left={primaryContent} 
          right={secondaryContent} 
          showRight={panels.length > 0} 
          initialLeftWidth={800}
        />
      </main>
    </div>
  );
}
