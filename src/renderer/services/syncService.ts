import { isTauri, getTauriAPI } from './tauriBridge';

export interface SyncResult {
  success: boolean;
  error?: string;
  details?: any;
}

export const syncService = {
  start: async (): Promise<SyncResult> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('sync_start');
    } else {
      return await window.api.sync.start();
    }
  },

  getStatus: async (): Promise<any> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('sync_get_status');
    } else {
      return await window.api.sync.getStatus();
    }
  },

  pull: async (): Promise<SyncResult> => {
    if (isTauri()) {
      const api = await getTauriAPI();
      return await api?.invoke('sync_pull');
    } else {
      return await window.api.sync.pull();
    }
  }
};
