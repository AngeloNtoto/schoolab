import { check } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

/**
 * Clamp un pourcentage entre 0 et 100
 */
function clampPct(n: number): number {
  if (!Number.isFinite(n)) return 0;
  if (n < 0) return 0;
  if (n > 100) return 100;
  return Math.round(n);
}

export interface UpdateProgress {
  status: string;
  percent: number;
  downloading: boolean;
  available: boolean;
  version?: string;
}

export type ProgressCallback = (progress: UpdateProgress) => void;

export const updateService = {
  /**
   * Vérifie si une mise à jour est disponible
   */
  check: async (): Promise<{ available: boolean; version?: string }> => {
    try {
      const update = await check();
      return {
        available: !!update?.available,
        version: update?.version
      };
    } catch (error) {
      console.error('[Updater] Erreur lors de la vérification :', error);
      return { available: false };
    }
  },

  /**
   * Vérifie et propose l'installation si mise à jour disponible
   * @param silent - Si true, ne demande pas confirmation pour les mises à jour mineures
   * @param onProgress - Callback pour suivre la progression
   */
  checkForUpdates: async (silent = true, onProgress?: ProgressCallback) => {
    try {
      console.log('[Updater] Vérification des mises à jour...');
      onProgress?.({ 
        status: 'Vérification...', 
        percent: 0, 
        downloading: false, 
        available: false 
      });

      const update = await check();
      
      if (!update?.available) {
        console.log('[Updater] Aucune mise à jour disponible.');
        onProgress?.({ 
          status: 'Application à jour', 
          percent: 0, 
          downloading: false, 
          available: false 
        });
        return { available: false };
      }

      console.log(`[Updater] Nouvelle version disponible : ${update.version}`);
      onProgress?.({ 
        status: `Nouvelle version ${update.version} disponible`, 
        percent: 0, 
        downloading: false, 
        available: true,
        version: update.version
      });

      return { available: true, version: update.version, update };
    } catch (error) {
      console.error('[Updater] Erreur lors de la vérification :', error);
      onProgress?.({ 
        status: 'Erreur de vérification', 
        percent: 0, 
        downloading: false, 
        available: false 
      });
      return { available: false };
    }
  },

  /**
   * Télécharge et installe la mise à jour avec suivi de progression
   */
  downloadAndInstall: async (onProgress?: ProgressCallback) => {
    try {
      const update = await check();
      if (!update?.available) {
        console.log('[Updater] Pas de mise à jour disponible.');
        return false;
      }

      console.log('[Updater] Téléchargement et installation...');
      onProgress?.({ 
        status: 'Téléchargement...', 
        percent: 0, 
        downloading: true, 
        available: true,
        version: update.version
      });

      await update.downloadAndInstall((evt: any) => {
        // Debug: log complet de l'event pour diagnostic
        console.log('[Updater] Event raw:', evt);

        // Détection du type d'événement (selon les versions du plugin)
        const type = 
          evt?.event ?? 
          evt?.type ?? 
          evt?.status ?? 
          evt?.kind ?? 
          (typeof evt === 'string' ? evt : undefined);

        if (type) {
          console.log('[Updater] Type:', type);
        }

        // Progress: plusieurs shapes possibles selon la version
        // Cas A: { event: "Progress", data: { downloaded, contentLength } }
        const downloaded = 
          evt?.data?.downloaded ?? 
          evt?.downloaded ?? 
          evt?.chunkLength ?? 
          0;

        const contentLength = 
          evt?.data?.contentLength ?? 
          evt?.contentLength ?? 
          evt?.total ?? 
          0;

        if (downloaded && contentLength) {
          const pct = clampPct((downloaded / contentLength) * 100);
          console.log(`[Updater] Progress ${pct}% (${downloaded}/${contentLength})`);
          onProgress?.({ 
            status: `Téléchargement... ${pct}%`, 
            percent: pct, 
            downloading: true, 
            available: true,
            version: update.version
          });
          return;
        }

        // Cas B: parfois on reçoit déjà un pourcentage
        const pct = 
          evt?.data?.percent ?? 
          evt?.percent ?? 
          evt?.progress;

        if (typeof pct === 'number') {
          const p = clampPct(pct);
          console.log(`[Updater] Progress ${p}%`);
          onProgress?.({ 
            status: `Téléchargement... ${p}%`, 
            percent: p, 
            downloading: true, 
            available: true,
            version: update.version
          });
          return;
        }

        // Cas C: events textuels simples
        if (type === 'Started' || type === 'started') {
          onProgress?.({ 
            status: 'Téléchargement démarré...', 
            percent: 0, 
            downloading: true, 
            available: true,
            version: update.version
          });
        } else if (type === 'Finished' || type === 'finished') {
          onProgress?.({ 
            status: 'Téléchargement terminé. Installation...', 
            percent: 100, 
            downloading: true, 
            available: true,
            version: update.version
          });
        }
      });

      console.log('[Updater] Installation terminée, redémarrage...');
      onProgress?.({ 
        status: 'Installation terminée. Redémarrage...', 
        percent: 100, 
        downloading: false, 
        available: true,
        version: update.version
      });

      await relaunch();
      return true;
    } catch (error) {
      console.error('[Updater] Erreur lors de l\'installation :', error);
      onProgress?.({ 
        status: 'Erreur lors de l\'installation', 
        percent: 0, 
        downloading: false, 
        available: false 
      });
      return false;
    }
  }
};
