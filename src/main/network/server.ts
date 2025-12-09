import express from 'express';
import { Server } from 'http';
import { saveTransfer } from './staging';
import { TransferPayload } from './types';
import { BrowserWindow } from 'electron';

let server: Server | null = null;
let currentPort = 0;

export function startServer(): Promise<number> {
  return new Promise((resolve, reject) => {
    const app = express();
    app.use(express.json({ limit: '50mb' }));

    app.post('/api/transfer', (req, res) => {
      try {
        const payload: TransferPayload = req.body;
        console.log('Received transfer from:', payload.sender);
        
        const filename = saveTransfer(payload);
        
        // Notify renderer
        BrowserWindow.getAllWindows().forEach(win => {
          win.webContents.send('network:transfer-received', { filename, sender: payload.sender });
        });

        res.json({ success: true, filename });
      } catch (err: any) {
        console.error('Transfer error:', err);
        res.status(500).json({ success: false, error: err.message });
      }
    });

    // Listen on port 0 (random available port)
    server = app.listen(0, () => {
      const addr = server?.address();
      if (addr && typeof addr !== 'string') {
        currentPort = addr.port;
        console.log('Network server listening on port:', currentPort);
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
