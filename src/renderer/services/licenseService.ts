import { isTauri, getTauriAPI } from './tauriBridge';

export interface LicenseInfo {
  active: boolean;
  isTrial: boolean;
  plan: 'TRIAL' | 'BASIC' | 'PRO' | 'PLUS';
  key?: string;
  hwid?: string;
  [key: string]: any;
}

export interface ActivationResult {
  success: boolean;
  error?: string;
  plan?: string;
  info?: any;
}

export const licenseService = {
  getInfo: async (): Promise<LicenseInfo> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('get_license_info');
    } else {
      return await window.api.license.getInfo();
    }
  },

  activate: async (key: string, password?: string): Promise<ActivationResult> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('activate_license', { key, password });
    } else {
      return await window.api.license.activate(key, password);
    }
  },

  refreshRemote: async (): Promise<{ success: boolean; info: any }> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('refresh_remote_license');
    } else {
      return await window.api.license.refreshRemote();
    }
  },

  getHWID: async (): Promise<string> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('get_hwid');
    } else {
      return await window.api.license.getMachineId();
    }
  }
};
