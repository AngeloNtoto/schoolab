export interface Api {
  db: {
    query<T = any>(sql: string, params?: any[]): Promise<T[]>;
    execute(sql: string, params?: any[]): Promise<{ lastInsertRowid: number; changes: number }>;
    checkSyncStatus(): Promise<{ overdue: boolean }>;
    populateTestData(): Promise<void>;
  };
  network: {
    getPeers(): Promise<any[]>;
    sendFile(peer: any, data: any): Promise<any>;
    getPendingTransfers(): Promise<any[]>;
    acceptTransfer(filename: string): Promise<any>;
    rejectTransfer(filename: string): Promise<void>;
    getIdentity(): Promise<string>;
    setIdentity(name: string): Promise<boolean>;
    getServerInfo(): Promise<{ ip: string; port: number } | null>;
    onTransferReceived(callback: (event: any, data: any) => void): () => void;
    onPeersUpdated(callback: (event: any, peers: any[]) => void): () => void;
    onDbChanged(callback: (event: any, data: any) => void): () => void;
    broadcastGradeUpdate(updates: any[]): Promise<boolean>;
  };
  license: {
    getHWID(): Promise<string>;
    getStatus(): Promise<any>;
    getInfo(): Promise<any>;
    activate(key: string, password?: string): Promise<{ success: boolean; error?: string }>;
    refreshRemote(): Promise<any>;
  };
  auth: {
    check(): Promise<boolean>;
    create(password: string): Promise<void>;
    verify(password: string): Promise<boolean>;
  };
  settings: {
    get(key: string): Promise<any>;
  };
  sync: {
    start(): Promise<{ success: boolean; error?: string }>;
    pull(): Promise<{ success: boolean; error?: string }>;
  };
}

declare global {
  interface Window {
    api: Api;
  }
}
