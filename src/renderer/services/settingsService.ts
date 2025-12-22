export interface Setting {
  key: string;
  value: string;
}

export const settingsService = {
  get: async (key: string): Promise<string | null> => {
    try {
      const result = await window.api.db.query<{ value: string }>(
        'SELECT value FROM settings WHERE key = ?',
        [key]
      );
      return result.length > 0 ? result[0].value : null;
    } catch (error) {
      console.error(`Failed to get setting ${key}:`, error);
      return null;
    }
  },

  set: async (key: string, value: string): Promise<void> => {
    try {
      // Upsert logic (insert or replace)
      await window.api.db.execute(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [key, value]
      );
    } catch (error) {
      console.error(`Failed to set setting ${key}:`, error);
      throw error;
    }
  },

  getAll: async (): Promise<Record<string, string>> => {
    try {
      const results = await window.api.db.query<Setting>('SELECT * FROM settings');
      const settings: Record<string, string> = {};
      results.forEach(s => {
        settings[s.key] = s.value;
      });
      return settings;
    } catch (error) {
      console.error('Failed to get all settings:', error);
      return {};
    }
  }
};
