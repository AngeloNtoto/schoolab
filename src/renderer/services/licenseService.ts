import { getTauriAPI } from './tauriBridge';

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
    const api = await getTauriAPI();
    return await api?.invoke('get_license_info');
  },

  activate: async (key: string, password?: string): Promise<ActivationResult> => {
      const api = await getTauriAPI();
      return await api?.invoke('activate_license', { key, password });
  },

  refreshRemote: async (): Promise<{ success: boolean; info: any }> => {
      const api = await getTauriAPI();
      return await api?.invoke('refresh_remote_license');
  },

  getHWID: async (): Promise<string> => {
      const api = await getTauriAPI();
      return await api?.invoke('get_hwid');
  }
};
