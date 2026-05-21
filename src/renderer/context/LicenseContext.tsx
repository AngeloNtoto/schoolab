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
  syncPull: () => Promise<{ success: boolean; error?: string; summary?: string }>;
  syncPush: () => Promise<{ success: boolean; error?: string; summary?: string }>;
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

  const syncPush = async () => {
    try {
      const result = await syncService.push();
      return result;
    } catch (error: any) {
      console.error("Sync push failed", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    refreshLicense();

    console.log("[LicenseContext] Setting up auto-refresh interval (30s)");
    const licenseInterval = setInterval(() => {
      refreshRemoteLicense();
    }, 30 * 1000);

    // Background Push every 5 minutes (300s)
    console.log("[LicenseContext] Setting up background sync push interval (5m)");
    const syncInterval = setInterval(async () => {
      console.log("[LicenseContext] Triggering background push...");
      syncPush(); // Silent call
    }, 5 * 60 * 1000);

    return () => {
      clearInterval(licenseInterval);
      clearInterval(syncInterval);
    };
  }, []);

  return (
    <LicenseContext.Provider value={{ license, loading, refreshLicense, refreshRemoteLicense, syncPull, syncPush }}>
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
