import Fuse from 'fuse.js';
import * as mammoth from 'mammoth';

export interface RawStudent {
  [key: string]: any;
}

export interface MappedStudent {
  firstName: string;
  lastName: string;
  postName?: string;
  gender: string;
  birthDate?: string;
  birthplace?: string;
}

const FIELD_MAPPING = {
  last_name: ['NOM', 'NAME', 'NOM DE FAMILLE', 'FAMILLE'],
  post_name: ['POSTNOM', 'POST-NOM', 'SECOND NOM', 'POST NAME'],
  first_name: ['PRENOM', 'PRÉNOM', 'FIRST NAME', 'GIVEN NAME'],
  gender: ['SEXE', 'GENDER', 'GENRE', 'S'],
  birthplace: ['LIEU DE NAISSANCE', 'LIEU', 'PLACE OF BIRTH', 'BIRTHPLACE', 'ORIGINE'],
  birth_date: ['DATE DE NAISSANCE', 'DATE', 'NÉ LE', 'NE LE', 'DOB', 'BIRTHDAY', 'DATE NAISSANCE'],
};

/**
 * Fuzzy match headers to internal fields
 */
export function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  
  // Sort target fields by priority/uniqueness
  const targetFields = Object.keys(FIELD_MAPPING);
  
  targetFields.forEach((field) => {
    const aliases = (FIELD_MAPPING as any)[field];
    const fuse = new Fuse(headers.filter(h => !usedHeaders.has(h)), { 
      threshold: 0.4,
      includeScore: true 
    });
    
    let bestMatch: { item: string, score: number } | null = null;
    
    aliases.forEach((alias: string) => {
      const results = fuse.search(alias);
      if (results.length > 0) {
        if (!bestMatch || (results[0].score! < bestMatch.score)) {
          bestMatch = { item: results[0].item, score: results[0].score! };
        }
      }
    });
    
    if (bestMatch) {
      mapping[field] = (bestMatch as any).item;
      usedHeaders.add((bestMatch as any).item);
    }
  });

  return mapping;
}

/**
 * Parse a DOCX file and extract table data
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<RawStudent[]> {
  const result = await mammoth.convertToHtml({ arrayBuffer: buffer });
  const html = result.value;
  
  // Use DOMParser to extract table rows
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');
  const tables = doc.querySelectorAll('table');
  
  if (tables.length === 0) return [];
  
  // Assuming the first table is the one we want
  const table = tables[0];
  const rows = Array.from(table.querySelectorAll('tr'));
  if (rows.length < 2) return [];
  
  const headers = Array.from(rows[0].querySelectorAll('td')).map(td => td.textContent?.trim() || '');
  
  return rows.slice(1).map(row => {
    const cells = Array.from(row.querySelectorAll('td'));
    const student: RawStudent = {};
    headers.forEach((h, i) => {
      if (h) student[h] = cells[i]?.textContent?.trim() || '';
    });
    return student;
  });
}

/**
 * Parse a date string into ISO format (YYYY-MM-DD)
 */
export function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  
  const clean = dateStr.trim();
  
  // Handle DD/MM/YYYY or DD.MM.YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (dmyMatch) {
    let [_, d, m, y] = dmyMatch;
    if (y.length === 2) {
      const currentYear = new Date().getFullYear();
      const century = currentYear - (currentYear % 100);
      y = (parseInt(y) + century).toString();
      // If result is in the future, assume previous century
      if (parseInt(y) > currentYear) y = (parseInt(y) - 100).toString();
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  
  // Handle YYYY-MM-DD
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) {
    return clean;
  }

  // Handle Month names (fr/en) - very basic
  // ... omitting complex natural language parsing for now to keep it robust

  return undefined;
}

/**
 * Clean gender string to 'M' or 'F'
 */
export function parseGender(genderStr: string): string {
  if (!genderStr) return 'M';
  const clean = genderStr.trim().toUpperCase();
  if (clean.startsWith('F') || clean === 'FEMININ' || clean === 'FEMME') return 'F';
  return 'M';
}

/**
 * Smart parse pasted text
 * Often Word tables pasted as text result in one cell per line
 * OR tab-separated values.
 */
export function parsePastedText(text: string): RawStudent[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  
  // Try to detect if it's "one cell per line" (the user's example)
  // Example: N, NOM, POSTNOM, PRENOM... 1, Ntoto, Biongo, Ange...
  // We look for a pattern where every N lines looks like a header/row
  
  // 1. Check if it's tab-separated (standard Excel paste)
  if (text.includes('\t')) {
    const tableLines = text.split(/\r?\n/).filter(l => l.trim() !== '');
    const headers = tableLines[0].split('\t');
    return tableLines.slice(1).map(line => {
      const cells = line.split('\t');
      const row: RawStudent = {};
      headers.forEach((h, i) => {
        row[h] = cells[i] || '';
      });
      return row;
    });
  }

  // 2. Try the "field per line" detection
  // If we have a lot of lines and it looks repeated
  // Let's assume the first few lines are headers until we hit a number or a repeated pattern.
  // Actually, we can ask the user to verify the mapping.
  
  // For the specific case of the user's snippet:
  // N, NOM, POSTNOM, PRENOM, SEXE, LIEU, DATE (7 fields)
  // 1., Ntoto, Biongo, Ange, M, Biponga, 30/07/2008 (7 fields)
  
  // We can try to guess the number of columns.
  // Usually headers are unique and strings.
  // Let's try to find where the first "data row" starts (often starts with 1 or 1.)
  const firstDataIndex = lines.findIndex((l, i) => i > 0 && /^\d+\.?$/.test(l));
  
  if (firstDataIndex > 0) {
    const colCount = firstDataIndex;
    const headers = lines.slice(0, colCount);
    const rows: RawStudent[] = [];
    
    for (let i = colCount; i < lines.length; i += colCount) {
      const chunk = lines.slice(i, i + colCount);
      if (chunk.length === 0) break;
      const row: RawStudent = {};
      headers.forEach((h, j) => {
        row[h] = chunk[j] || '';
      });
      rows.push(row);
    }
    return rows;
  }

  return [];
}
