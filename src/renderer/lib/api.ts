export interface Api {
  db: {
    query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
    execute: (sql: string, params?: any[]) => Promise<any>;
    populateTestData: () => Promise<void>;
  };
  network: {
    getPeers: () => Promise<any[]>;
    sendFile: (peer: any, data: any) => Promise<any>;
    getPendingTransfers: () => Promise<any[]>;
    acceptTransfer: (filename: string) => Promise<any>;
    rejectTransfer: (filename: string) => Promise<void>;
    getIdentity: () => Promise<string>;
    setIdentity: (name: string) => Promise<boolean>;
    onTransferReceived: (callback: (event: any, data: any) => void) => () => void;
    onPeersUpdated: (callback: (event: any, peers: any[]) => void) => () => void;
    onDbChanged: (callback: (event: any, data: any) => void) => () => void;
  };
}

declare global {
  interface Window {
    api: Api;
  }
}
