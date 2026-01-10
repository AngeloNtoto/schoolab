import express from 'express';
import { Server } from 'node:http';
import { saveTransfer } from './staging';
import { TransferPayload } from './types';
import { BrowserWindow } from 'electron';
import Database from 'better-sqlite3';
import path from 'node:path';
import fs from 'node:fs';

let server: Server | null = null;
let currentPort = 0;

// Module-level SSE clients array for external broadcast access
let sseClients: any[] = [];

/**
 * Broadcast an event to all connected SSE clients (web UI).
 * This can be called from outside to notify web clients of changes made on desktop.
 */
export function broadcastToWebClients(event: string, data: any, senderId?: string) {
  const payload = `data: ${JSON.stringify({ event, data, senderId })}\n\n`;
  sseClients.forEach(c => {
    try {
      c.res.write(payload);
    } catch (e) {
      console.error('[RÉSEAU] Échec de l\'écriture vers le client SSE', e);
    }
  });
}

/**
 * Démarre le serveur Express pour l'API et l'interface Web
 */
export function startServer(db: Database.Database): Promise<number> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json({ limit: '50mb' }));

    // Journalisation des requêtes (Logger)
    app.use((req, res, next) => {
      console.log(`[NETWORK] ${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });

    const { app: electronApp } = require('electron');
    const isDev = !electronApp.isPackaged;

    // Clients SSE (Server-Sent Events) - utiliser la référence au niveau module
    app.get('/api/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const client = { res };
      sseClients.push(client);

      req.on('close', () => {
        const index = sseClients.indexOf(client);
        if (index > -1) sseClients.splice(index, 1);
      });
    });

    // Local reference to module-level broadcast for internal use
    const broadcast = broadcastToWebClients;
    
    // Intégration Vite pour le développement (HMR)
    if (isDev) {
      try {
        const { createServer } = require('vite');
        createServer({
          server: { middlewareMode: true },
          appType: 'spa',
          root: path.resolve(__dirname, '../../src/web-ui'),
          configFile: path.resolve(__dirname, '../../src/web-ui/vite.config.ts'),
        }).then((vite: any) => {
          app.use(vite.middlewares);
          console.log('[NETWORK] Vite HMR middleware integrated');
        }).catch((e: any) => {
          console.error('[NETWORK] Failed to start Vite middleware:', e);
        });
      } catch (e) {
        console.error('[NETWORK] Failed to start Vite middleware (require):', e);
      }
    }
    
    // Tentative de localisation des fichiers de l'interface Web
    const possiblePaths = [
      path.join(electronApp.getAppPath(), 'dist-web'),
      path.join(process.cwd(), 'dist-web'),
      path.join(__dirname, '../../dist-web'), 
    ];

    let staticPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log('[RÉSEAU] Service de l\'UI Web depuis :', p);
        app.use(express.static(p));
        staticPath = p;
        break;
      }
    }

    if (!staticPath) {
      console.error('[RÉSEAU] Fichiers statiques de l\'UI Web INTROUVABLES ! Chemins testés :', possiblePaths);
    }

    // API : Récupérer les classes
    app.get('/api/classes', (req, res) => {
      try {
        const classes = db.prepare('SELECT * FROM classes ORDER BY level, section').all();
        res.json(classes);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // API : Récupérer toutes les données d'une classe (Élèves, Matières, Notes)
    app.get('/api/classes/:id/full', (req, res) => {
      try {
        const classId = req.params.id;
        const students = db.prepare('SELECT * FROM students WHERE class_id = ?').all(classId);
        const subjects = db.prepare('SELECT * FROM subjects WHERE class_id = ? ORDER BY created_at ASC').all(classId);
        const grades = db.prepare(`
          SELECT g.* FROM grades g 
          JOIN students s ON g.student_id = s.id 
          WHERE s.class_id = ?
        `).all(classId);
        
        res.json({ students, subjects, grades });
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // API : Enregistrement par lot des notes
    app.post('/api/grades/batch', (req, res) => {
      try {
        const { updates, senderId } = req.body;
        console.log(`[RÉSEAU] Reçu ${updates?.length || 0} mises à jour de notes de ${senderId || 'inconnu'}`);
        
        if (!updates || !Array.isArray(updates)) {
          return res.status(400).json({ success: false, error: 'Tableau de mises à jour valide requis' });
        }

        const upsert = db.prepare(`
          INSERT INTO grades (student_id, subject_id, period, value)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, subject_id, period) DO UPDATE SET value = excluded.value
        `);

        const transaction = db.transaction((data) => {
          for (const item of data) {
            upsert.run(item.student_id, item.subject_id, item.period, item.value);
          }
        });

        transaction(updates);
        console.log('[RÉSEAU] Mise à jour par lot réussie');

        // Notification au processus renderer d'Electron avec les données granulaires
        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed() && win.webContents) {
            win.webContents.send('db:changed', { type: 'grades_batch', senderId, updates });
          }
        });

        // Notification à l'interface Web (SSE)
        broadcast('db:changed', { type: 'grades_batch' }, senderId);

        res.json({ success: true });
      } catch (err: any) {
        console.error('[RÉSEAU] Erreur de mise à jour par lot :', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // API : Réception d'un transfert de fichier
    app.post('/api/transfer', (req, res) => {
      try {
        const payload: TransferPayload = req.body;
        console.log('[RÉSEAU] Transfert reçu de :', payload.sender);
        
        const filename = saveTransfer(payload);
        
        // Notification au renderer
        BrowserWindow.getAllWindows().forEach(win => {
          if (!win.isDestroyed() && win.webContents) {
            win.webContents.send('network:transfer-received', { filename, sender: payload.sender });
          }
        });

        res.json({ success: true, filename });
      } catch (err: any) {
        console.error('[NETWORK] Transfer error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Gestion du routage SPA (Single Page Application)
    app.get(/^\/(?!api).*/, (req, res) => {
      if (staticPath) {
        const indexPath = path.resolve(path.join(staticPath, 'index.html'));
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send(`index.html introuvable dans ${staticPath}`);
        }
      } else {
        res.status(404).send('UI Web non configurée (aucun dossier statique trouvé).');
      }
    });

    // Écoute sur un port aléatoire disponible (port 0)
    server = app.listen(0, '0.0.0.0', () => {
      const addr = server?.address();
      if (addr && typeof addr !== 'string') {
        currentPort = addr.port;
        console.log('==============================================');
        console.log(`[RÉSEAU] SERVEUR DÉMARRÉ SUR LE PORT : ${currentPort}`);
        console.log(`[RÉSEAU] SERVICE DE L'UI WEB DEPUIS : ${staticPath || 'NON TROUVÉ'}`);
        console.log('==============================================');
        resolve(currentPort);
      } else {
        reject(new Error('Échec de la récupération du port du serveur'));
      }
    });
  });
}

/**
 * Arrête le serveur
 */
export function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

/**
 * Récupère le port actuel du serveur
 */
export function getServerPort(): number {
  return currentPort;
}

