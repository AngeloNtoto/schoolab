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
import NetworkDashboard from './pages/Network/NetworkDashboard';
import { CacheProvider } from './context/CacheContext';
import { ToastProvider } from './context/ToastContext';


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
      console.debug('[App] checkSetup result length=', result.length, result?.[0]);
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
        <ToastProvider>
          {/* Wait until we know if setup is complete before rendering routes/redirects */}
          {isSetupComplete === null ? (
            <div className="min-h-screen flex items-center justify-center">Chargement…</div>
          ) : (
            <Routes>
            <Route path="/setup" element={<SetupWizard />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/class/:id" element={<ClassDetails />} />
            <Route path="/student/:id" element={<CouponEleve />} />
            <Route path="/bulletin/:studentId" element={<Bulletin />} />
            <Route path="/palmares/:classId" element={<Palmares />} />
            <Route path="/print-coupons/:classId" element={<ClassCoupons />} />
            <Route path="/print-bulletins/:classId" element={<ClassBulletins />} />
            <Route path="/network" element={<NetworkDashboard />} />
            <Route path="/" element={<Navigate to={isSetupComplete === true ? "/dashboard" : "/setup"} replace />} />
            </Routes>
          )}
        </ToastProvider>
      </CacheProvider>
    </HashRouter>
  );
}
