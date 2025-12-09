import { Bonjour } from 'bonjour-service';
import { BrowserWindow } from 'electron';
import os from 'os';

const bonjour = new Bonjour();
let service: any = null;
let browser: any = null;

export function startDiscovery(name: string, port: number) {
  // 1. Publish our service
  console.log(`Publishing service: ${name} on port ${port}`);
  service = bonjour.publish({
    name: name,
    type: 'ecole-sync',
    port: port,
    txt: { version: '1.0.0' }
  });

  // 2. Browse for other services
  browser = bonjour.find({ type: 'ecole-sync' });
  
  browser.on('up', (service: any) => {
    console.log('Found peer:', service.name);
    broadcastPeers();
  });

  browser.on('down', (service: any) => {
    console.log('Peer lost:', service.name);
    broadcastPeers();
  });
}

function broadcastPeers() {
  const peers = browser.services.map((s: any) => ({
    name: s.name,
    ip: s.referer.address, // Note: might need better IP resolution
    port: s.port,
    hostname: s.host
  }));

  BrowserWindow.getAllWindows().forEach(win => {
    win.webContents.send('network:peers-updated', peers);
  });
}

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

export function getPeers() {
  if (!browser) return [];
  return browser.services.map((s: any) => ({
    name: s.name,
    ip: s.referer.address,
    port: s.port,
    hostname: s.host
  }));
}
