// Charger les variables d'environnement depuis .env
import dotenv from 'dotenv';
dotenv.config();

import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';

// Gère la création/suppression des raccourcis sur Windows lors de l'installation/désinstallation.
if (process.platform === "win32") {
  try {
    // eslint-disable-next-line
    const started = require("electron-squirrel-startup");
    if (started) {
      app.quit();
    }
  } catch (e) {
    // Si une erreur survient, on ignore
  }
}

const createWindow = () => {
  // Création de la fenêtre du navigateur.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 720,
    icon: process.platform === 'linux' 
      ? path.join(__dirname, '../../src/renderer/assets/icon.png')
      : path.join(__dirname, '../../src/renderer/assets/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      backgroundThrottling:true,
      spellcheck:false,
    },
  });

  console.log("isPackaged:", app.isPackaged, "devUrl:", MAIN_WINDOW_VITE_DEV_SERVER_URL);

  // Chargement de l'URL de développement ou du fichier index.html.
  const devUrl = MAIN_WINDOW_VITE_DEV_SERVER_URL;

  // En production, on ignore toujours le devUrl
  if (!app.isPackaged && devUrl) {
    mainWindow.loadURL(devUrl);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`)
    );
  }

  // Ouvre les outils de développement en mode non-packagé.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
    mainWindow.setMenuBarVisibility(true);
  }
};

// Cette méthode sera appelée quand Electron aura fini l'initialisation.
import { getDb } from './db';
import { startServer, stopServer, getServerPort, broadcastToWebClients } from './main/network/server';
import { startDiscovery, stopDiscovery, getPeers } from './main/network/discovery';
import { listPendingTransfers, getTransferContent, deleteTransfer } from './main/network/staging';
import { initializeLicenseService } from './main/licenseService';
import { syncService } from './main/syncService';

app.on('ready', () => {
  console.log(`Le cloud url : ${process.env.CLOUD_URL}`)
  const db = getDb();

  // Initialisation des services Cloud et Licence
  initializeLicenseService();
  syncService.initialize();

  // IPC pour la Base de Données
  ipcMain.handle('db:query', (_event, sql, params) => {
    const stmt = db.prepare(sql);
    return stmt.all(params || []);
  });

  ipcMain.handle('db:execute', (_event, sql, params) => {
    const stmt = db.prepare(sql);
    return stmt.run(params || []);
  });

  ipcMain.handle('db:check-sync-status', () => {
    const tables = ['academic_years', 'classes', 'students', 'subjects', 'grades', 'notes', 'domains'];
    const overdueLimit = "datetime('now', '-24 hours')";
    
    try {
      for (const table of tables) {
        const result = db.prepare(`SELECT 1 FROM ${table} WHERE is_dirty = 1 AND last_modified_at < ${overdueLimit} LIMIT 1`).get();
        if (result) return { overdue: true };
      }
      
      const deletionResult = db.prepare(`SELECT 1 FROM sync_deletions WHERE deleted_at < ${overdueLimit} LIMIT 1`).get();
      if (deletionResult) return { overdue: true };
      
      return { overdue: false };
    } catch (err) {
      console.error('Error checking sync status:', err);
      return { overdue: false };
    }
  });

  // Services RÉSEAU
  const startNetwork = async () => {
    try {
      let machineName = db
        .prepare("SELECT value FROM settings WHERE key = 'machine_name'")
        .get() as { value: string } | undefined;

      if (!machineName) {
        const defaultName = `Ecole-${Math.floor(Math.random() * 1000)}`;
        db.prepare("INSERT INTO settings (key, value) VALUES ('machine_name', ?)").run(defaultName);
        machineName = { value: defaultName };
      }

      const port = await startServer(db);
      startDiscovery(machineName.value, port);
    } catch (err) {
      console.error('Erreur lors du démarrage des services réseau:', err);
    }
  };

  startNetwork();

  ipcMain.handle('network:get-identity', () => {
    const res = db.prepare("SELECT value FROM settings WHERE key = 'machine_name'").get() as { value: string };
    return res?.value || 'Inconnu';
  });

  ipcMain.handle('network:set-identity', (_event, name) => {
    db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES ('machine_name', ?)").run(name);
    stopDiscovery();
    startDiscovery(name, getServerPort());
    return true;
  });

  ipcMain.handle('network:get-peers', () => getPeers());
  ipcMain.handle('network:get-pending', () => listPendingTransfers());
  ipcMain.handle('network:accept-transfer', (_event, filename) => getTransferContent(filename));
  ipcMain.handle('network:reject-transfer', (_event, filename) => {
    deleteTransfer(filename);
    return true;
  });

  // Broadcast grade updates to web clients (SSE) - called from renderer when grades change on desktop
  ipcMain.handle('network:broadcast-grade-update', (_event, updates: any[]) => {
    console.log('[NETWORK] Broadcasting grade updates to web clients:', updates?.length || 0);
    broadcastToWebClients('db:changed', { type: 'grade_update', updates }, 'desktop');
    return true;
  });

  // Récupère l'adresse IP locale sans dépendre du module 'ip' qui cause des erreurs une fois packagé
  ipcMain.handle('network:get-server-info', () => {
    const interfaces = os.networkInterfaces();
    let localIp = '127.0.0.1';

    for (const name of Object.keys(interfaces)) {
      const netInterface = interfaces[name];
      if (netInterface) {
        for (const iface of netInterface) {
          // On cherche une adresse IPv4 qui n'est pas interne (loopback)
          if (iface.family === 'IPv4' && !iface.internal) {
            localIp = iface.address;
            break;
          }
        }
      }
      if (localIp !== '127.0.0.1') break;
    }

    return {
      ip: localIp,
      port: getServerPort()
    };
  });

  ipcMain.handle('network:send-file', async (_event, peer, data) => {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://${peer.ip}:${peer.port}/api/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`Erreur HTTP ! statut: ${response.status}`);
    return await response.json();
  });

  // Création de la fenêtre
  createWindow();
});

// Fermer le serveur lors de la fermeture de l'application
app.on('will-quit', () => {
  stopServer();
  stopDiscovery();
});



// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
