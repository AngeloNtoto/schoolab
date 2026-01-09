import React, { createContext, useContext, useState, useEffect } from 'react';

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
      const info = await (window as any).api.license.getInfo();
      setLicense(info);
    } catch (error) {
      console.error("Failed to fetch license info", error);
    } finally {
      setLoading(false);
    }
  };

  const refreshRemoteLicense = async () => {
    try {
      const result = await (window as any).api.license.refreshRemote();
      if (result.success) {
        setLicense(result.info);
      }
    } catch (error) {
      console.error("Failed to refresh remote license", error);
    }
  };

  const syncPull = async () => {
    try {
      return await (window as any).api.sync.pull();
    } catch (error: any) {
      console.error("Sync pull failed", error);
      return { success: false, error: error.message };
    }
  };

  useEffect(() => {
    refreshLicense();
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
