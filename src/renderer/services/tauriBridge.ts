export async function getTauriAPI() {
  const { invoke } = await import('@tauri-apps/api/core');
  const Database = await import('@tauri-apps/plugin-sql').then(m => m.default);
  const path = await import('@tauri-apps/api/path');
  return { invoke, Database, path };
}
