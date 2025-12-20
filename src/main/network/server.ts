import express from 'express';
import { Server } from 'http';
import { saveTransfer } from './staging';
import { TransferPayload } from './types';
import { BrowserWindow } from 'electron';

import Database from 'better-sqlite3';
import path from 'path';

let server: Server | null = null;
let currentPort = 0;

export function startServer(db: Database.Database): Promise<number> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json({ limit: '50mb' }));

    // Request Logger
    app.use((req, res, next) => {
      console.log(`[NETWORK] ${new Date().toISOString()} ${req.method} ${req.url}`);
      next();
    });

    const { app: electronApp } = require('electron');
    const isDev = !electronApp.isPackaged;
    const fs = require('fs');

    // SSE Clients
    const clients: any[] = [];
    app.get('/api/events', (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.flushHeaders();

      const client = { res };
      clients.push(client);

      req.on('close', () => {
        const index = clients.indexOf(client);
        if (index > -1) clients.splice(index, 1);
      });
    });

    const broadcast = (event: string, data: any) => {
      const payload = `data: ${JSON.stringify({ event, data })}\n\n`;
      clients.forEach(c => {
        try {
          c.res.write(payload);
        } catch (e) {
          console.error('[NETWORK] Failed to write to SSE client', e);
        }
      });
    };
    
    // Integration Vite (HMR)
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
        });
      } catch (e) {
        console.error('[NETWORK] Failed to start Vite middleware:', e);
      }
    }
    
    // Attempt to find web-UI files in multiple locations
    const possiblePaths = [
      path.join(electronApp.getAppPath(), 'dist-web'),
      path.join(process.cwd(), 'dist-web'),
      path.join(__dirname, '../../dist-web'), 
    ];

    let staticPath = '';
    for (const p of possiblePaths) {
      if (fs.existsSync(p)) {
        console.log('[NETWORK] Serving Web-UI from:', p);
        app.use(express.static(p));
        staticPath = p;
        break;
      }
    }

    if (!staticPath) {
      console.error('[NETWORK] Web-UI static files NOT FOUND! Searched in:', possiblePaths);
    }

    // API: Classes
    app.get('/api/classes', (req, res) => {
      try {
        const classes = db.prepare('SELECT * FROM classes ORDER BY level, section').all();
        res.json(classes);
      } catch (err: any) {
        res.status(500).json({ error: err.message });
      }
    });

    // API: Full Class Data (Students, Subjects, Grades)
    app.get('/api/classes/:id/full', (req, res) => {
      try {
        const classId = req.params.id;
        const students = db.prepare('SELECT * FROM students WHERE class_id = ?').all(classId);
        const subjects = db.prepare('SELECT * FROM subjects WHERE class_id = ?').all(classId);
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

    // API: Batch Save Grades
    app.post('/api/grades/batch', (req, res) => {
      try {
        const { updates } = req.body; // Array of { student_id, subject_id, period, value }
        console.log(`[NETWORK] Received ${updates?.length || 0} grade updates`);
        
        if (!updates || !Array.isArray(updates)) {
          return res.status(400).json({ success: false, error: 'Valid updates array required' });
        }

        const upsert = db.prepare(`
          INSERT INTO grades (student_id, subject_id, period, value)
          VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, subject_id, period) DO UPDATE SET value = excluded.value
        `);

        const transaction = db.transaction((data) => {
          for (const item of data) {
            console.log(`[DB] Upserting grade: student=${item.student_id}, subject=${item.subject_id}, period=${item.period}, value=${item.value}`);
            upsert.run(item.student_id, item.subject_id, item.period, item.value);
          }
        });

        transaction(updates);
        console.log('[NETWORK] Batch grade update successful');

        // Notify renderer
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('db:changed', { type: 'grades_batch' });
        });

        // Notify Web-UI
        broadcast('db:changed', { type: 'grades_batch' });

        res.json({ success: true });
      } catch (err: any) {
        console.error('[NETWORK] Batch update error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    app.post('/api/transfer', (req, res) => {
      try {
        const payload: TransferPayload = req.body;
        console.log('[NETWORK] Received transfer from:', payload.sender);
        
        const filename = saveTransfer(payload);
        
        // Notify renderer
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('network:transfer-received', { filename, sender: payload.sender });
        });

        res.json({ success: true, filename });
      } catch (err: any) {
        console.error('[NETWORK] Transfer error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // SPA Catch-all (using regex for compatibility with all Express versions)
    app.get(/^\/(?!api).*/, (req, res) => {
      if (staticPath) {
        const indexPath = path.resolve(path.join(staticPath, 'index.html'));
        if (fs.existsSync(indexPath)) {
          res.sendFile(indexPath);
        } else {
          res.status(404).send(`index.html not found in ${staticPath}`);
        }
      } else {
        res.status(404).send('Web-UI not configured (no static folder found). Searched in: ' + possiblePaths.join(', '));
      }
    });

    // Listen on port 0 (random available port)
    server = app.listen(0, '0.0.0.0', () => {
      const addr = server?.address();
      if (addr && typeof addr !== 'string') {
        currentPort = addr.port;
        console.log('==============================================');
        console.log(`[NETWORK] SERVER STARTED ON PORT: ${currentPort}`);
        console.log(`[NETWORK] SERVING WEB-UI FROM: ${staticPath || 'NOT FOUND'}`);
        console.log('==============================================');
        resolve(currentPort);
      } else {
        reject(new Error('Failed to get server port'));
      }
    });
  });
}

export function stopServer() {
  if (server) {
    server.close();
    server = null;
  }
}

export function getServerPort(): number {
  return currentPort;
}
