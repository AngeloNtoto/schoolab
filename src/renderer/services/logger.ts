import { attachConsole, info, warn, error, debug, trace } from '@tauri-apps/plugin-log';

/**
 * Initialize the logging system
 * Captures all console.log/warn/error and routes them to the file logger
 */
export async function initLogger() {
  try {
    // This will redirect all browser console logs to the Rust backend logger
    await attachConsole();
    info('Frontend logger initialized and attached to console.');
  } catch (e) {
    console.error('Failed to attach console to Tauri logger:', e);
  }
}

export const logger = {
  info,
  warn,
  error,
  debug,
  trace
};
