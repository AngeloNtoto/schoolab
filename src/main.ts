import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (process.platform=="win32") {
try{
  //eslint-disable-next-line
  const started = require("electron-squirrel-startup");

if (started) {
  app.quit();
}
}
catch(e){
  //si erreur on ignore
}
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, '../renderer/main_window/icon-256.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(
      path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`),
    );
  }

  // Open the DevTools.
  if (!app.isPackaged) {
    mainWindow.webContents.openDevTools();
  }
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
import { getDb } from './db';
import { startServer, stopServer, getServerPort } from './main/network/server';
import { startDiscovery, stopDiscovery, getPeers } from './main/network/discovery';
import { listPendingTransfers, getTransferContent, deleteTransfer } from './main/network/staging';

// ...

app.on('ready', () => {
  const db = getDb();

  // IPC DB
  ipcMain.handle('db:query', (_event, sql, params) => {
    const stmt = db.prepare(sql);
    return stmt.all(params || []);
  });

  ipcMain.handle('db:execute', (_event, sql, params) => {
    const stmt = db.prepare(sql);
    return stmt.run(params || []);
  });

  // NETWORK
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

      const port = await startServer();
      startDiscovery(machineName.value, port);
    } catch (err) {
      console.error('Failed to start network services:', err);
    }
  };

  startNetwork();

  ipcMain.handle('network:get-identity', () => {
    const res = db.prepare("SELECT value FROM settings WHERE key = 'machine_name'").get() as { value: string };
    return res?.value || 'Unknown';
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

  ipcMain.handle('network:send-file', async (_event, peer, data) => {
    const fetch = (await import('node-fetch')).default;
    const response = await fetch(`http://${peer.ip}:${peer.port}/api/transfer`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.json();
  });

  // Seulement après, la fenêtre
  createWindow();
});


// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
