export interface Api {
  db: {
    query: <T = any>(sql: string, params?: any[]) => Promise<T[]>;
    execute: (sql: string, params?: any[]) => Promise<{ changes: number; lastInsertRowid: number | bigint }>;
  };
}

declare global {
  interface Window {
    api: Api;
  }
}
