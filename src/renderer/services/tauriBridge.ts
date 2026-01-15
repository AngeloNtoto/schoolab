/**
 * Utilitaire pour l'accès aux APIs natives de Tauri.
 */

export const isTauri = () => true;

/**
 * Charge dynamiquement les APIs Tauri.
 */
export async function getTauriAPI() {
  const { invoke } = await import('@tauri-apps/api/core');
  const Database = await import('@tauri-apps/plugin-sql').then(m => m.default);
  return { invoke, Database };
}
