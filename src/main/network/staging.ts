import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { TransferPayload } from './types';

const TRANSFERS_DIR = path.join(app.getPath('userData'), 'transfers');
const PENDING_DIR = path.join(TRANSFERS_DIR, 'pending');

// Ensure directories exist
if (!fs.existsSync(TRANSFERS_DIR)) fs.mkdirSync(TRANSFERS_DIR);
if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR);

export function saveTransfer(payload: TransferPayload): string {
  const filename = `${payload.timestamp}_${payload.sender.replace(/[^a-z0-9]/gi, '_')}.json`;
  const filepath = path.join(PENDING_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));
  return filename;
}

export function listPendingTransfers(): { filename: string; payload: TransferPayload }[] {
  if (!fs.existsSync(PENDING_DIR)) return [];
  
  return fs.readdirSync(PENDING_DIR)
    .filter(f => f.endsWith('.json'))
    .map(filename => {
      try {
        const content = fs.readFileSync(path.join(PENDING_DIR, filename), 'utf-8');
        return {
          filename,
          payload: JSON.parse(content)
        };
      } catch (e) {
        console.error(`Error reading transfer ${filename}:`, e);
        return null;
      }
    })
    .filter((item): item is { filename: string; payload: TransferPayload } => item !== null);
}

export function getTransferContent(filename: string): TransferPayload | null {
  try {
    const filepath = path.join(PENDING_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

export function deleteTransfer(filename: string) {
  const filepath = path.join(PENDING_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}
