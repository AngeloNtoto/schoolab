import Fuse from 'fuse.js';

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
 * Parse a DOCX file and extract table data using pure code (native browser APIs)
 * DOCX is a ZIP archive containing XML files.
 */
export async function parseDocx(buffer: ArrayBuffer): Promise<RawStudent[]> {
  try {
    const view = new DataView(buffer);
    let offset = 0;
    let xmlContent = '';

    // Precise ZIP parser
    while (offset < buffer.byteLength - 30) {
      if (view.getUint32(offset, true) === 0x04034b50) {
        const flags = view.getUint16(offset + 6, true);
        const method = view.getUint16(offset + 8, true);
        const fileNameLen = view.getUint16(offset + 26, true);
        const extraLen = view.getUint16(offset + 28, true);
        const fileName = new TextDecoder().decode(new Uint8Array(buffer, offset + 30, fileNameLen));
        
        const hasDataDescriptor = (flags & 0x08) !== 0;
        let compressedSize = view.getUint32(offset + 18, true);
        const dataStart = offset + 30 + fileNameLen + extraLen;

        if (fileName === 'word/document.xml') {
          // Find next PK signature if size is missing (Data Descriptor case)
          if (hasDataDescriptor && compressedSize === 0) {
            let scan = dataStart;
            while (scan < buffer.byteLength - 4) {
              if (view.getUint32(scan, true) === 0x04034b50 || view.getUint32(scan, true) === 0x02014b50) {
                compressedSize = scan - dataStart;
                // If there's a Data Descriptor (12 or 16 bytes), back up
                if (view.getUint32(scan - 12, true) === 0x08074b50) compressedSize -= 12;
                else if (view.getUint32(scan - 16, true) === 0x08074b50) compressedSize -= 16;
                break;
              }
              scan++;
            }
          }

          if (compressedSize > 0) {
            const compressedData = new Uint8Array(buffer, dataStart, compressedSize);

            if (method === 8) { // DEFLATE
              const ds = new DecompressionStream('deflate-raw' as any);
              const writer = ds.writable.getWriter();
              await writer.write(compressedData);
              await writer.close();
              const response = new Response(ds.readable);
              xmlContent = await response.text();
            } else if (method === 0) { // STORE
              xmlContent = new TextDecoder().decode(compressedData);
            }
          }
          break;
        }
        
        // Skip correctly
        if (compressedSize > 0) {
          offset = dataStart + compressedSize + (hasDataDescriptor ? 12 : 0);
        } else {
          offset += 30 + fileNameLen + extraLen + 1; // Scan next
        }
      } else {
        offset++;
      }
    }

    if (!xmlContent) return [];

    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'application/xml');
    const w = "http://schemas.openxmlformats.org/wordprocessingml/2006/main";
    const tables = doc.getElementsByTagNameNS(w, 'tbl');
    if (tables.length === 0) return [];
    
    const table = tables[0];
    const rows = Array.from(table.getElementsByTagNameNS(w, 'tr'));
    if (rows.length < 2) return [];

    const getRowText = (row: Element) => {
      const cells = Array.from(row.getElementsByTagNameNS(w, 'tc'));
      return cells.map(cell => {
        const textElements = Array.from(cell.getElementsByTagNameNS(w, 't'));
        return textElements.map(t => t.textContent).join('');
      });
    };

    const headers = getRowText(rows[0]);
    return rows.slice(1).map(row => {
      const cellsText = getRowText(row);
      const student: RawStudent = {};
      headers.forEach((h, i) => {
        if (h) student[h.trim()] = cellsText[i]?.trim() || '';
      });
      return student;
    });
  } catch (error) {
    console.error("Error parsing DOCX natively:", error);
    throw error; // Re-throw to show user the failure
  }
}

/**
 * Parse a date string into ISO format (YYYY-MM-DD)
 */
export function parseDate(dateStr: string): string | undefined {
  if (!dateStr) return undefined;
  const clean = dateStr.trim();
  const dmyMatch = clean.match(/^(\d{1,2})[\/\.-](\d{1,2})[\/\.-](\d{2,4})$/);
  if (dmyMatch) {
    let [_, d, m, y] = dmyMatch;
    if (y.length === 2) {
      const currentYear = new Date().getFullYear();
      const century = currentYear - (currentYear % 100);
      y = (parseInt(y) + century).toString();
      if (parseInt(y) > currentYear) y = (parseInt(y) - 100).toString();
    }
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const ymdMatch = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (ymdMatch) return clean;
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