import { Bonjour } from 'bonjour-service';
import { BrowserWindow } from 'electron';

const bonjour = new Bonjour();
let service: any = null;
let browser: any = null;

/**
 * Démarre la découverte automatique sur le réseau local
 */
export function startDiscovery(name: string, port: number) {
  // 1. Publier notre propre service
  console.log(`Publication du service : ${name} sur le port ${port}`);
  service = bonjour.publish({
    name: name,
    type: 'Schoolab-sync',
    port: port,
    txt: { version: '1.0.0' }
  });

  // 2. Rechercher d'autres services sur le réseau
  browser = bonjour.find({ type: 'Schoolab-sync' });
  
  browser.on('up', (service: any) => {
    console.log('Pair trouvé :', service.name);
    broadcastPeers();
  });

  browser.on('down', (service: any) => {
    console.log('Pair déconnecté :', service.name);
    broadcastPeers();
  });
}

/**
 * Diffuse la liste des pairs trouvés à tous les processus renderer
 */
function broadcastPeers() {
  const peers = browser.services.map((s: any) => ({
    name: s.name,
    ip: s.referer.address, // Note : peut nécessiter une meilleure résolution d'IP si complexe
    port: s.port,
    hostname: s.host
  }));

  BrowserWindow.getAllWindows().forEach(win => {
    if (!win.isDestroyed() && win.webContents) {
      win.webContents.send('network:peers-updated', peers);
    }
  });
}

/**
 * Arrête le service de découverte
 */
export function stopDiscovery() {
  if (service) {
    service.stop();
    service = null;
  }
  if (browser) {
    browser.stop();
    browser = null;
  }
}

/**
 * Récupère la liste actuelle des pairs
 */
export function getPeers() {
  if (!browser) return [];
  return browser.services.map((s: any) => ({
    name: s.name,
    ip: s.referer.address,
    port: s.port,
    hostname: s.host
  }));
}

