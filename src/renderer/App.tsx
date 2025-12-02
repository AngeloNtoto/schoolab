import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import ClassDetails from './components/ClassDetails';
import StudentDetails from './components/StudentDetails';
import Bulletin from './components/Bulletin';

export default function App() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkSetup();
  }, []);

  const checkSetup = async () => {
    try {
      const result = await window.api.db.query<{ value: string }>(
        "SELECT value FROM settings WHERE key = 'school_name' LIMIT 1"
      );
      setIsSetupComplete(result.length > 0);
    } catch (error) {
      console.error('Failed to check setup:', error);
      setIsSetupComplete(false);
    }
  };

  if (isSetupComplete === null) {
    return (
      <div 
        className="min-h-screen flex items-center justify-center bg-slate-50"
        style={{
          backgroundImage: 'url(/assets/loading-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
          <p className="mt-6 text-slate-700 font-medium text-lg">Chargement de EcoleGest...</p>
        </div>
      </div>
    );
  }

  return (
    <HashRouter>
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/class/:id" element={<ClassDetails />} />
        <Route path="/student/:id" element={<StudentDetails />} />
        <Route path="/bulletin/:id" element={<Bulletin />} />
        <Route path="/" element={<Navigate to={isSetupComplete ? "/dashboard" : "/setup"} replace />} />
      </Routes>
    </HashRouter>
  );
}
