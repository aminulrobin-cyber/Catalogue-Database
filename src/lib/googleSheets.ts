import Papa from 'papaparse';

export function extractSheetId(url: string): string | null {
  const regex = /\/d\/([a-zA-Z0-9-_]+)/;
  const match = url.match(regex);
  return match ? match[1] : null;
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

export async function fetchSheetData(url: string) {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  // Extract the gid (tab ID) if it exists in the URL
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);
  const gidParam = gidMatch ? `&gid=${gidMatch[1]}` : '';

  // Construct CSV export URL pointing specifically to that tab
  const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv${gidParam}`;

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet: ${response.statusText}. Please ensure the sheet sharing setting is "Anyone with the link can view".`);
    }

    const csvText = await response.text();
    
    if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.includes('<html')) {
      throw new Error('This Google Sheet is PRIVATE. Please click "Share" in Google Sheets and change it to "Anyone with the link can view".');
    }
    
    // Parse CSV to JSON
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header) => header.trim(),
    });

    return parsed.data as Record<string, string>[]; // Array of row objects
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}
