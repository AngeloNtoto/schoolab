import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

export const updateService = {
  /**
   * Vérifie si une mise à jour est disponible et propose l'installation
   */
  checkForUpdates: async (silent = true) => {
    try {
      console.log('[Updater] Vérification des mises à jour...');
      const update = await check();
      
      if (update?.available) {
        console.log(`[Updater] Nouvelle version disponible : ${update.version}`);
        
        const confirm = window.confirm(
          `Une nouvelle version (${update.version}) est disponible. Voulez-vous l'installer maintenant ?`
        );

        if (confirm) {
          console.log('[Updater] Téléchargement et installation...');
          // Ajout d'un callback pour voir la progression si besoin
          await update.downloadAndInstall((event) => {
              console.log(`Téléchargement : ${event.contentLength}`);
          });
          console.log('[Updater] Installation terminée, redémarrage...');
          await relaunch();
        }
      } else {
        if (!silent) {
          alert('Votre application est à jour.');
        }
      }
    } catch (error) {
      console.error('[Updater] Erreur lors de la vérification :', error);
      if (!silent) {
        alert('Erreur lors de la vérification des mises à jour.');
      }
    }
  }
};
