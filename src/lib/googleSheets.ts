import * as XLSX from 'xlsx';

export function extractSheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  return match ? match[1] : null;
}

// Extract the actual URL from a HYPERLINK() formula
function extractHyperlinkUrl(formula: string): string | null {
  if (!formula) return null;
  // Match HYPERLINK("url", "display") or HYPERLINK("url")
  const match = formula.match(/HYPERLINK\s*\(\s*"([^"]+)"/i);
  return match ? match[1] : null;
}

// Convert Excel serial date number to readable date string
function excelDateToString(serial: number): string {
  // Excel dates start from 1900-01-01 (serial 1)
  const excelEpoch = new Date(1899, 11, 30); // Dec 30, 1899
  const date = new Date(excelEpoch.getTime() + serial * 86400000);
  
  const day = date.getDate();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  
  return `${day}-${month}-${year}`;
}

export async function fetchSheetTitle(url: string): Promise<string> {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const match = html.match(/<title>(.*?)<\/title>/);
    if (match) {
      return match[1].replace(' - Google Sheets', '').trim();
    }
    return 'Untitled Sheet';
  } catch (error) {
    return 'Untitled Sheet';
  }
}

export async function fetchSheetData(url: string): Promise<Record<string, string>[]> {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  // Download the spreadsheet as XLSX to preserve HYPERLINK() formulas
  const xlsxUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=xlsx`;
  
  const response = await fetch(xlsxUrl);
  if (!response.ok) {
    throw new Error(`Failed to download sheet (${response.status}). Ensure sharing is set to "Anyone with the link can view".`);
  }

  const arrayBuffer = await response.arrayBuffer();
  
  // Parse with formulas enabled
  const workbook = XLSX.read(new Uint8Array(arrayBuffer), { 
    type: 'array', 
    cellFormula: true 
  });

  // Find the target tab (default: "Catalogue Tracker")
  const defaultTab = process.env.DEFAULT_SHEET_TAB || 'Catalogue Tracker';
  const sheetName = workbook.SheetNames.find(
    name => name.toLowerCase().trim() === defaultTab.toLowerCase().trim()
  ) || workbook.SheetNames[0];

  const worksheet = workbook.Sheets[sheetName];
  if (!worksheet) {
    throw new Error(`Sheet "${sheetName}" not found in the workbook`);
  }

  const ref = worksheet['!ref'];
  if (!ref) return [];

  const range = XLSX.utils.decode_range(ref);

  // Extract headers from the first row (trim whitespace)
  const headers: string[] = [];
  for (let c = range.s.c; c <= range.e.c; c++) {
    const cell = worksheet[XLSX.utils.encode_cell({ r: range.s.r, c })];
    headers.push(cell ? String(cell.v).trim() : '');
  }

  // Extract data rows
  const rows: Record<string, string>[] = [];
  
  for (let r = range.s.r + 1; r <= range.e.r; r++) {
    const record: Record<string, string> = {};
    let hasData = false;

    for (let c = range.s.c; c <= range.e.c; c++) {
      const header = headers[c - range.s.c];
      if (!header) continue;

      const cell = worksheet[XLSX.utils.encode_cell({ r, c })];
      
      if (cell) {
        // If the cell has a HYPERLINK() formula, extract the actual URL
        if (cell.f) {
          const hyperlinkUrl = extractHyperlinkUrl(cell.f);
          if (hyperlinkUrl) {
            record[header] = hyperlinkUrl;
            hasData = true;
            continue;
          }
        }

        // Handle Excel date serial numbers (type "n" in date columns)
        if (cell.t === 'n' && header.toLowerCase().includes('date')) {
          record[header] = excelDateToString(cell.v);
        } else {
          record[header] = cell.v !== undefined ? String(cell.v).trim() : '';
        }
        
        if (record[header]) hasData = true;
      } else {
        record[header] = '';
      }
    }

    if (hasData) rows.push(record);
  }

  return rows;
}
