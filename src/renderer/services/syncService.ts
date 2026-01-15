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

  pull: async (): Promise<SyncResult> => {
    const api = await getTauriAPI();
    // sync_pull n'est pas encore implémenté en Rust ou a un autre nom.
    // Pour l'instant, on utilise sync_start qui fait le push.
    return await api?.invoke('sync_start');
  }
};
