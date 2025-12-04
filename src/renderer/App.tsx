import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import ClassDetails from './components/ClassDetails';
import CouponEleve from './components/CouponEleve';
import Bulletin from './components/Bulletin';
import Palmares from './components/Palmares';
import ClassCoupons from './components/ClassCoupons';
import ClassBulletins from './components/ClassBulletins';
import StartupLoader from './components/StartupLoader';
import PopulateTestData from './components/PopulateTestData';
import { CacheProvider } from './context/CacheContext';


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
      <CacheProvider>
        {showLoader && isSetupComplete !== null && (
          <StartupLoader onComplete={handleLoaderComplete} />
        )}
        <Routes>
          <Route path="/setup" element={<SetupWizard />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/class/:id" element={<ClassDetails />} />
          <Route path="/student/:id" element={<CouponEleve />} />
          <Route path="/bulletin/:studentId" element={<Bulletin />} />
          <Route path="/palmares/:classId" element={<Palmares />} />
          <Route path="/print-coupons/:classId" element={<ClassCoupons />} />
          <Route path="/print-bulletins/:classId" element={<ClassBulletins />} />
          <Route path="/populate-test-data" element={<PopulateTestData />} />
          <Route path="/" element={<Navigate to={isSetupComplete ? "/dashboard" : "/setup"} replace />} />
        </Routes>
      </CacheProvider>
    </HashRouter>
  );
}
