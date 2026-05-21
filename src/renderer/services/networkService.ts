
import { getTauriAPI } from './tauriBridge';

export interface Peer {
  name: string;
  ip: string;
}

export interface ServerInfo {
  ip: string;
  port: number;
  running: boolean;
}

export const networkService = {
  getIdentity: async (): Promise<string> => {
    return "Appareil Local";
  },

  setIdentity: async (name: string): Promise<void> => {
    console.warn("setIdentity not yet implemented in Tauri", name);
  },

  getPeers: async (): Promise<Peer[]> => {
    return [];
  },

  onPeersUpdated: (callback: (event: any, peers: Peer[]) => void) => {
    return () => {};
  },

  sendFile: async (peer: Peer, payload: any): Promise<void> => {
    console.warn("sendFile (P2P) not yet implemented in Tauri", peer, payload);
    throw new Error("Fonctionnalité P2P non disponible sur cette version.");
  },

  onFileReceived: (callback: (event: any, payload: any) => void) => {
    return () => {};
  },

  getInboundFiles: async (): Promise<any[]> => {
    return [];
  },

  acceptFile: async (id: string): Promise<any> => {
    console.warn("acceptFile not yet implemented in Tauri", id);
    return null;
  },

  rejectFile: async (id: string): Promise<void> => {
    console.warn("rejectFile not yet implemented in Tauri", id);
  },

  // Serveur Web pour le Marking Board
  // Vérifie si le serveur web est en cours d'exécution
  isServerRunning: async (): Promise<boolean> => {
    const api = await getTauriAPI();
    // On type explicitement le retour de invoke pour que TypeScript connaisse la structure
    const info = await api?.invoke<ServerInfo>('get_web_server_info');
    return info?.running ?? false;
  },

  // Récupère les informations du serveur (IP, port, état)
  getServerInfo: async (): Promise<ServerInfo | null> => {
    const api = await getTauriAPI();
    return await api?.invoke<ServerInfo>('get_web_server_info') ?? null;
  },

  // Démarre le serveur web pour le Marking Board
  startServer: async (): Promise<ServerInfo> => {
    const api = await getTauriAPI();
    const result = await api?.invoke<ServerInfo>('start_web_server');
    if (!result) {
      throw new Error('Impossible de démarrer le serveur');
    }
    return result;
  },

  stopServer: async (): Promise<void> => {
    console.warn("stopServer not yet implemented - server runs until app close");
  },

  // Diffuse un changement aux clients connectés (Marking Board)
  broadcastDbChange: async (payload: any): Promise<void> => {
    const api = await getTauriAPI();
    await api?.invoke('broadcast_db_change', { payload });
  }
};
