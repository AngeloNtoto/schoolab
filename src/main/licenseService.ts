import { machineIdSync } from 'node-machine-id';
import { getDb } from '../db';
import { ipcMain } from 'electron';


/**
 * Get the cloud URL from environment variables.
 * This is a function to ensure it's evaluated AFTER dotenv loads the .env file.
 */
function getCloudUrl(): string {
  const url = process.env.CLOUD_URL;
  if (!url) {
    throw new Error('CLOUD_URL is not defined in environment variables. Please check your .env file.');
  }
  return url;
}


export function getHWID(): string {
  try {
    return machineIdSync();
  } catch (error) {
    console.error('Failed to get machine ID:', error);
    return 'UNKNOWN-DEVICE';
  }
}

export function initializeLicenseService() {
  const db = getDb();

  // Ensure trial_start_date exists
  const trialStart = db.prepare("SELECT value FROM settings WHERE key = 'trial_start_date'").get() as { value: string } | undefined;
  if (!trialStart) {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('trial_start_date', ?)").run(new Date().toISOString());
  }

  ipcMain.handle('license:get-hwid', () => {
    return getHWID();
  });

  const getLicenseInfo = () => {
    const license = db.prepare("SELECT value FROM settings WHERE key = 'license_key'").get() as { value: string } | undefined;
    const expiresAtStr = db.prepare("SELECT value FROM settings WHERE key = 'license_expires_at'").get() as { value: string } | undefined;
    const trialStartStr = db.prepare("SELECT value FROM settings WHERE key = 'trial_start_date'").get() as { value: string } | undefined;
    const lastSeenStr = db.prepare("SELECT value FROM settings WHERE key = 'license_last_seen_date'").get() as { value: string } | undefined;

    const now = new Date();
    let clockTampered = false;

    // Detect clock rollback (with 5-minute grace period for minor drifts)
    if (lastSeenStr) {
      const lastSeen = new Date(lastSeenStr.value);
      const gracePeriod = 5 * 60 * 1000; // 5 minutes
      if (now.getTime() < lastSeen.getTime() - gracePeriod) {
        console.error('Clock manipulation detected!');
        clockTampered = true;
      }
    }

    // Update last seen date if clock is fine
    if (!clockTampered) {
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_last_seen_date', ?)").run(now.toISOString());
    }

    let totalExpiresAt: Date;
    let isTrial = false;

    if (license && expiresAtStr) {
      totalExpiresAt = new Date(expiresAtStr.value);
    } else {
      isTrial = true;
      const start = new Date(trialStartStr?.value || new Date().toISOString());
      totalExpiresAt = new Date(start.getTime() + 14 * 24 * 60 * 60 * 1000); // 14 days
    }

    const diffTime = totalExpiresAt.getTime() - now.getTime();
    const daysRemaining = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    const isExpired = diffTime <= 0;

    console.log(`[License Check] Now: ${now.toISOString()}, Expires: ${totalExpiresAt.toISOString()}, Diff: ${diffTime}, Expired: ${isExpired}, Tampered: ${clockTampered}`);

    return {
      active: !!license && !isExpired && !clockTampered,
      isTrial,
      daysRemaining,
      expiresAt: totalExpiresAt.toISOString(),
      isExpired,
      isBlocked: isExpired || clockTampered,
      clockTampered,
      key: license?.value,
      hwid: getHWID()
    };
  };

  ipcMain.handle('license:get-info', () => {
    return getLicenseInfo();
  });

  ipcMain.handle('license:get-status', () => {
    const info = getLicenseInfo();
    const token = db.prepare("SELECT value FROM settings WHERE key = 'license_token'").get() as { value: string } | undefined;
    return { active: info.active && !!token, key: info.key };
  });

  ipcMain.handle('license:activate', async (_event, key: string, password?: string) => {
    try {
      const hwid = getHWID();
      const fetch = (await import('node-fetch')).default;
      
      const response = await fetch(`${getCloudUrl()}/api/license/activate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, hwid, password })
      });

      const result = (await response.json()) as any;

      if (result.success) {
        // Save license details
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_key', ?)").run(key);
        db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_token', ?)").run(result.token);
        
        if (result.expiresAt) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires_at', ?)").run(result.expiresAt);
        }

        // Save school ID from cloud
        if (result.school?.id) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_id', ?)").run(result.school.id);
        }
        // Save school info from cloud (name, city, pobox)
        if (result.school?.name) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_name', ?)").run(result.school.name);
        }
        if (result.school?.city) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_city', ?)").run(result.school.city);
        }
        if (result.school?.pobox) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('school_pobox', ?)").run(result.school.pobox);
        }

        return { success: true };
      } else {
        return { success: false, error: result.error || 'Activation failed' };
      }
    } catch (error: any) {
      console.error('Activation error:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('license:refresh-remote', async () => {
    try {
      const schoolId = db.prepare("SELECT value FROM settings WHERE key = 'school_id'").get() as { value: string } | undefined;
      const licenseToken = db.prepare("SELECT value FROM settings WHERE key = 'license_token'").get() as { value: string } | undefined;

      if (!schoolId || !licenseToken) {
        return { success: false, error: "NOT_LINKED" };
      }

      const fetch = (await import('node-fetch')).default;
      const response = await fetch(`${getCloudUrl()}/api/license/status?schoolId=${schoolId.value}`, {
        method: 'GET',
        headers: { 
          'Authorization': `Bearer ${licenseToken.value}`,
          'X-HWID': getHWID()
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch remote license status");
      }

      const result = (await response.json()) as any;
      if (result.success && result.license) {
        // Update local status
        if (result.license.active) {
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires_at', ?)").run(result.license.expiresAt);
        } else {
          // Revoked or inactive - force expiration
          console.log("License is inactive/revoked on server. Forcing local expiration.");
          const pastDate = new Date();
          pastDate.setDate(pastDate.getDate() - 1);
          db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('license_expires_at', ?)").run(pastDate.toISOString());
        }
        
        // Optionally update other fields if needed
        return { success: true, info: getLicenseInfo() };
      }
      return { success: false, error: "Invalid server response" };
    } catch (error: any) {
      console.error('Remote refresh error:', error);
      return { success: false, error: error.message };
    }
  });

  // ============================================
  // LOCAL AUTHENTICATION (PASSWORD)
  // ============================================

  /**
   * Simple hash function for password storage.
   * Note: This is basic obfuscation, not cryptographically secure.
   * For a desktop app with local storage, this provides reasonable protection.
   */
  const simpleHash = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
  };

  /**
   * Check if a local password has been set
   */
  ipcMain.handle('auth:check', () => {
    const passwordHash = db.prepare("SELECT value FROM settings WHERE key = 'local_password_hash'").get() as { value: string } | undefined;
    return { hasPassword: !!passwordHash };
  });

  /**
   * Create a new local password (first run)
   */
  ipcMain.handle('auth:create', (_event, password: string) => {
    try {
      const hash = simpleHash(password);
      db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('local_password_hash', ?)").run(hash);
      return { success: true };
    } catch (error) {
      console.error('Failed to create password:', error);
      return { success: false };
    }
  });

  /**
   * Verify the entered password against stored hash
   */
  ipcMain.handle('auth:verify', (_event, password: string) => {
    try {
      const stored = db.prepare("SELECT value FROM settings WHERE key = 'local_password_hash'").get() as { value: string } | undefined;
      if (!stored) return { valid: false };
      const inputHash = simpleHash(password);
      return { valid: stored.value === inputHash };
    } catch (error) {
      console.error('Password verification failed:', error);
      return { valid: false };
    }
  });
}
