import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('api', {
  db: {
    query: (sql: string, params?: any[]) => ipcRenderer.invoke('db:query', sql, params),
    execute: (sql: string, params?: any[]) => ipcRenderer.invoke('db:execute', sql, params),
    populateTestData: () => ipcRenderer.invoke('db:populateTestData'),
  },
});
