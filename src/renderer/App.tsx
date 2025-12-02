import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import ClassDetails from './components/ClassDetails';
import StudentDetails from './components/StudentDetails';
import Bulletin from './components/Bulletin';
import StartupLoader from './components/StartupLoader';

export default function App() {
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);
  const [showLoader, setShowLoader] = useState(true);

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

  const handleLoaderComplete = () => {
    setShowLoader(false);
  };

  return (
    <HashRouter>
      {showLoader && isSetupComplete !== null && (
        <StartupLoader onComplete={handleLoaderComplete} />
      )}
      <Routes>
        <Route path="/setup" element={<SetupWizard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/class/:id" element={<ClassDetails />} />
        <Route path="/student/:id" element={<StudentDetails />} />
        <Route path="/bulletin/:studentId" element={<Bulletin />} />
        <Route path="/" element={<Navigate to={isSetupComplete ? "/dashboard" : "/setup"} replace />} />
      </Routes>
    </HashRouter>
  );
}
