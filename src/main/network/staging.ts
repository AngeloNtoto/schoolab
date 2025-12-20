import fs from 'node:fs';
import path from 'node:path';
import { app } from 'electron';
import { TransferPayload } from './types';

// Dossier de stockage des transferts reçus
const TRANSFERS_DIR = path.join(app.getPath('userData'), 'transfers');
const PENDING_DIR = path.join(TRANSFERS_DIR, 'pending');

// S'assurer que les dossiers existent
if (!fs.existsSync(TRANSFERS_DIR)) fs.mkdirSync(TRANSFERS_DIR);
if (!fs.existsSync(PENDING_DIR)) fs.mkdirSync(PENDING_DIR);

/**
 * Sauvegarde un transfert reçu dans un fichier JSON temporaire
 */
export function saveTransfer(payload: TransferPayload): string {
  const filename = `${payload.timestamp}_${payload.sender.replace(/[^a-z0-9]/gi, '_')}.json`;
  const filepath = path.join(PENDING_DIR, filename);
  
  fs.writeFileSync(filepath, JSON.stringify(payload, null, 2));
  return filename;
}

/**
 * Liste tous les transferts en attente de traitement
 */
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
        console.error(`Erreur lors de la lecture du transfert ${filename}:`, e);
        return null;
      }
    })
    .filter((item): item is { filename: string; payload: TransferPayload } => item !== null);
}

/**
 * Récupère le contenu d'un transfert spécifique par son nom de fichier
 */
export function getTransferContent(filename: string): TransferPayload | null {
  try {
    const filepath = path.join(PENDING_DIR, filename);
    if (!fs.existsSync(filepath)) return null;
    return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
  } catch (e) {
    return null;
  }
}

/**
 * Supprime un fichier de transfert
 */
export function deleteTransfer(filename: string) {
  const filepath = path.join(PENDING_DIR, filename);
  if (fs.existsSync(filepath)) {
    fs.unlinkSync(filepath);
  }
}

