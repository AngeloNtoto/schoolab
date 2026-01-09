/**
 * App.tsx
 * 
 * Main application component that handles routing and authentication flow.
 * 
 * Flow:
 * 1. Check if local password exists
 * 2. If no password: show AuthScreen (create password)
 * 3. If password exists but not authenticated: show AuthScreen (login)
 * 4. If authenticated: check if setup is complete
 * 5. If setup not complete: show SetupWizard
 * 6. If setup complete: show main app with LicenseGuard
 */

import React, { useEffect, useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import SetupWizard from './components/SetupWizard';
import Dashboard from './components/Dashboard';
import Class from './components/Class';
import CouponEleve from './components/CouponEleve';
import Bulletin from './components/Bulletin';
import Palmares from './components/Palmares';
import ClassCoupons from './components/ClassCoupons';
import ClassBulletins from './components/ClassBulletins';
import NetworkDashboard from './pages/Network/NetworkDashboard';
import Layout from './components/Layout';
import AcademicYearsManager from './components/AcademicYearsManager';
import SettingsPage from './pages/SettingsPage';
import NotesPage from './pages/NotesPage';
import TutorialModal from './components/TutorialModal';
import AuthScreen from './components/AuthScreen';
import { CacheProvider } from './context/CacheContext';
import { ToastProvider } from './context/ToastContext';
import { ThemeProvider } from './context/ThemeContext';
import { TutorialProvider } from './context/TutorialContext';
import LicenseGuard from './components/LicenseGuard';
import { LicenseProvider } from './context/LicenseContext';

// Authentication states
type AuthState = 'loading' | 'create-password' | 'login' | 'authenticated';

export default function App() {
  // Local authentication state
  const [authState, setAuthState] = useState<AuthState>('loading');
  
  // Setup completion state
  const [isSetupComplete, setIsSetupComplete] = useState<boolean | null>(null);

  useEffect(() => {
    checkAuthState();
  }, []);

  /**
   * Check if user has created a local password
   */
  const checkAuthState = async () => {
    try {
      const result = await (window as any).api.auth.check();
      if (result.hasPassword) {
        setAuthState('login');
      } else {
        setAuthState('create-password');
      }
    } catch (error) {
      console.error('Failed to check auth state:', error);
      setAuthState('create-password'); // Default to create if error
    }
  };

  /**
   * Check if initial setup (school, classes, etc.) is complete
   */
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

  /**
   * Handle successful authentication
   */
  const handleAuthSuccess = () => {
    setAuthState('authenticated');
    checkSetup();
  };

  /**
   * Verify password against stored hash
   */
  const handleVerifyPassword = async (password: string): Promise<boolean> => {
    const result = await (window as any).api.auth.verify(password);
    return result.valid;
  };

  /**
   * Create new local password
   */
  const handleCreatePassword = async (password: string): Promise<boolean> => {
    const result = await (window as any).api.auth.create(password);
    return result.success;
  };

  // Show loading state
  if (authState === 'loading') {
    return (
      <div 
        className="min-h-screen flex items-center justify-center"
        style={{
          backgroundImage: 'url(/assets/loading-bg.png)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-xl text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  // Show auth screen (create password or login)
  if (authState === 'create-password' || authState === 'login') {
    return (
      <AuthScreen
        isFirstRun={authState === 'create-password'}
        onAuthSuccess={handleAuthSuccess}
        onVerifyPassword={handleVerifyPassword}
        onCreatePassword={handleCreatePassword}
      />
    );
  }

  // Main application
  return (
    <HashRouter>
      <ThemeProvider>
      <LicenseProvider>
      <CacheProvider>
        <TutorialProvider>
        <ToastProvider>
          {/* Wait until we know if setup is complete before rendering routes/redirects */}
          {isSetupComplete === null ? (
            <div className="min-h-screen flex items-center justify-center">Chargement…</div>
          ) : (
            <Routes>
            <Route path="/setup" element={<SetupWizard />} />
            <Route element={<LicenseGuard><Layout /></LicenseGuard>}>
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/class/:id" element={<Class/>} />
              <Route path="/student/:id" element={<CouponEleve />} />
              <Route path="/palmares/:classId" element={<Palmares />} />
              <Route path="/print-coupons/:classId" element={<ClassCoupons />} />
              <Route path="/network" element={<NetworkDashboard />} />
              <Route path="/academic-years" element={<AcademicYearsManager />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/notes" element={<NotesPage />} />
            </Route>
            <Route path="/" element={<Navigate to={isSetupComplete === true ? "/dashboard" : "/setup"} replace />} />
            </Routes>
          )}
          {/* Global Tutorial Modal */}
          <TutorialModal />
        </ToastProvider>
        </TutorialProvider>
      </CacheProvider>
      </LicenseProvider>
      </ThemeProvider>
    </HashRouter>
  );
}
