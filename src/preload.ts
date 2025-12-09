import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    execute: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),
    populateTestData: () => ipcRenderer.invoke('db:populateTestData'),
  },
  network: {
    getPeers: () => ipcRenderer.invoke('network:get-peers'),
    sendFile: (peer: any, data: any) => ipcRenderer.invoke('network:send-file', peer, data),
    getPendingTransfers: () => ipcRenderer.invoke('network:get-pending'),
    acceptTransfer: (filename: string) => ipcRenderer.invoke('network:accept-transfer', filename),
    rejectTransfer: (filename: string) => ipcRenderer.invoke('network:reject-transfer', filename),
    getIdentity: () => ipcRenderer.invoke('network:get-identity'),
    setIdentity: (name: string) => ipcRenderer.invoke('network:set-identity', name),
    onTransferReceived: (callback: (event: any, data: any) => void) => {
      ipcRenderer.on('network:transfer-received', callback);
      return () => ipcRenderer.removeListener('network:transfer-received', callback);
    },
    onPeersUpdated: (callback: (event: any, peers: any[]) => void) => {
      ipcRenderer.on('network:peers-updated', callback);
      return () => ipcRenderer.removeListener('network:peers-updated', callback);
    },
  },
});
