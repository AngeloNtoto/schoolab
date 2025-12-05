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
  mainWindow.webContents.openDevTools();
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
import { getDb } from './db';
import { populateTestData } from './main/populateTestData';

// ...

app.on('ready', () => {
  createWindow();

  const db = getDb();

  ipcMain.handle('db:query', (_event, sql, params) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.all(params || []);
    } catch (err: any) {
      console.error('Database query error:', err);
      throw err;
    }
  });

  ipcMain.handle('db:execute', (_event, sql, params) => {
    try {
      const stmt = db.prepare(sql);
      return stmt.run(params || []);
    } catch (err: any) {
      console.error('Database execute error:', err);
      throw err;
    }
  });

  ipcMain.handle('db:populateTestData', async () => {
    try {
      return await populateTestData(db);
    } catch (err: any) {
      console.error('Populate test data error:', err);
      throw err;
    }
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
