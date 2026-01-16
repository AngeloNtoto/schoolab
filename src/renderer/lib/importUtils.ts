import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

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

// Levenshtein distance for pure TS fuzzy matching
function levenshtein(a: string, b: string): number {
  const an = a ? a.length : 0;
  const bn = b ? b.length : 0;
  if (an === 0) return bn;
  if (bn === 0) return an;
  const matrix = new Array<number[]>(bn + 1);
  for (let i = 0; i <= bn; ++i) {
    let row = matrix[i] = new Array<number>(an + 1);
    row[0] = i;
  }
  const firstRow = matrix[0];
  for (let j = 1; j <= an; ++j) {
    firstRow[j] = j;
  }
  for (let i = 1; i <= bn; ++i) {
    for (let j = 1; j <= an; ++j) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1], // substitution
          matrix[i][j - 1],     // insertion
          matrix[i - 1][j]      // deletion
        ) + 1;
      }
    }
  }
  return matrix[bn][an];
}

function findBestMatch(target: string, candidates: string[], threshold = 0.4): { item: string, score: number } | null {
   if (!candidates.length) return null;
   let best: { item: string, score: number } | null = null;
   const lowerTarget = target.toLowerCase();

   for (const candidate of candidates) {
     const lowerCandidate = candidate.toLowerCase();
     
     // Exact match (score 0)
     if (lowerCandidate === lowerTarget) {
        return { item: candidate, score: 0 };
     }
     
     // Containment match (good score)
     if (lowerCandidate.includes(lowerTarget) || lowerTarget.includes(lowerCandidate)) {
         const score = 0.1; 
         if (!best || score < best.score) {
             best = { item: candidate, score };
         }
         continue; 
     }

     const dist = levenshtein(lowerTarget, lowerCandidate);
     const maxLength = Math.max(lowerTarget.length, lowerCandidate.length);
     // Avoid division by zero
     const score = maxLength === 0 ? 0 : dist / maxLength; 

     if (score <= threshold) {
       if (!best || score < best.score) {
         best = { item: candidate, score };
       }
     }
   }
   return best;
}

/**
 * Fuzzy match headers to internal fields using custom logic
 */
export function mapHeaders(headers: string[]): Record<string, string> {
  const mapping: Record<string, string> = {};
  const usedHeaders = new Set<string>();
  
  // Sort target fields by priority/uniqueness if needed, here just keys
  const targetFields = Object.keys(FIELD_MAPPING);
  
  targetFields.forEach((field) => {
    const aliases = (FIELD_MAPPING as any)[field];
    const availableHeaders = headers.filter(h => !usedHeaders.has(h));
    
    let bestMatch: { item: string, score: number } | null = null;
    
    aliases.forEach((alias: string) => {
      // Find best match for this alias among available headers
      const match = findBestMatch(alias, availableHeaders);
      
      if (match) {
        if (!bestMatch || match.score < bestMatch.score) {
          bestMatch = match;
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
 * Parse a DOCX file using mammoth
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<RawStudent[]> {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    const text = result.value;
    return parsePastedText(text);
  } catch (error) {
    console.error('Error parsing DOCX:', error);
    throw new Error('Erreur lors de la lecture du fichier Word. Assurez-vous qu\'il contient des données tabulaires.');
  }
}

/**
 * Parse an Excel file (.xlsx, .xls) using sheetjs
 */
export async function parseXlsx(buffer: ArrayBuffer): Promise<RawStudent[]> {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    // Convert to JSON
    const data = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
    return data as RawStudent[];
  } catch (error) {
    console.error('Error parsing Excel:', error);
    throw new Error('Erreur lors de la lecture du fichier Excel.');
  }
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
 */
export function parsePastedText(text: string): RawStudent[] {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(l => l !== '');
  
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
