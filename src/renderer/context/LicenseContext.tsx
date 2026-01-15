import React, { createContext, useContext, useState, useEffect } from 'react';
import { licenseService } from '../services/licenseService';
import { syncService } from '../services/syncService';

interface LicenseInfo {
  active: boolean;
  isTrial: boolean;
  daysRemaining: number;
  expiresAt: string;
  isExpired: boolean;
  isBlocked: boolean;
  clockTampered?: boolean;
  key?: string;
  hwid?: string;
  plan?: 'TRIAL' | 'PRO' | 'PLUS';
}

interface LicenseContextType {
  license: LicenseInfo | null;
  loading: boolean;
  refreshLicense: () => Promise<void>;
  refreshRemoteLicense: () => Promise<void>;
  syncPull: () => Promise<{ success: boolean; error?: string }>;
}

const LicenseContext = createContext<LicenseContextType | undefined>(undefined);

export function LicenseProvider({ children }: { children: React.ReactNode }) {
  const [license, setLicense] = useState<LicenseInfo | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshLicense = async () => {
    try {
      const info = await licenseService.getInfo();
      setLicense(info as any);
    } catch (error) {
      console.error("Failed to fetch license info", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRemoteLicense = async () => {
    console.log("[LicenseContext] Triggering remote license refresh...");
    try {
      const result = await licenseService.refreshRemote();
      console.log("[LicenseContext] Refresh result:", result);
      if (result.success) {
        console.log("[LicenseContext] Updating license state with new info:", result.info);
        setLicense(result.info);
      }
    } catch (error) {
      console.error("[LicenseContext] Failed to refresh remote license", error);
    }
  };

  const syncPull = async () => {
    try {
      const result = await syncService.pull();
      return result;
    } catch (error: any) {
      console.error("Sync pull failed", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    refreshLicense();

    console.log("[LicenseContext] Setting up auto-refresh interval (30s)");
    const interval = setInterval(() => {
      refreshRemoteLicense();
    }, 30 * 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <LicenseContext.Provider value={{ license, loading, refreshLicense, refreshRemoteLicense, syncPull }}>
      {children}
    </LicenseContext.Provider>
  );
}

export function useLicense() {
  const context = useContext(LicenseContext);
  if (context === undefined) {
    throw new Error('useLicense must be used within a LicenseProvider');
  }
  return context;
}
