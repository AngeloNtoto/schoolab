import { getTauriAPI } from './tauriBridge';

export interface SyncResult {
  success: boolean;
  error?: string;
  details?: any;
}

export const syncService = {
  start: async (): Promise<SyncResult> => {
   const api = await getTauriAPI();
    return await api?.invoke('sync_start');
  },

  getStatus: async (): Promise<any> => {
    const api = await getTauriAPI();
    return await api?.invoke('check_sync_status');
  },

  push: async (): Promise<SyncResult> => {
    const api = await getTauriAPI();
    return await api?.invoke('sync_push');
  },

  pull: async (): Promise<SyncResult> => {
    const api = await getTauriAPI();
    return await api?.invoke('sync_pull');
  }
};
