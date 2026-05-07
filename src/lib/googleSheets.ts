import Papa from 'papaparse';

export function extractSheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
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

export async function fetchSheetData(url: string): Promise<Record<string, string>[]> {
  const sheetId = extractSheetId(url);
  if (!sheetId) {
    throw new Error('Invalid Google Sheet URL');
  }

  // Extract gid from URL if present
  const gidMatch = url.match(/[#&?]gid=([0-9]+)/);

  // Read the default tab name from env (e.g. "Catalogue Tracker")
  const defaultTab = process.env.DEFAULT_SHEET_TAB || '';

  let csvUrl: string;

  if (gidMatch) {
    // URL has a specific tab gid — use it
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=${gidMatch[1]}`;
  } else if (defaultTab) {
    // No gid but we have a default tab name — use the gviz endpoint which supports sheet names
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&sheet=${encodeURIComponent(defaultTab)}`;
  } else {
    // Fallback: export the first tab
    csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  }

  try {
    const response = await fetch(csvUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch sheet (${response.status}). Ensure the sheet is set to "Anyone with the link can view".`);
    }

    const csvText = await response.text();

    // Detect if Google returned an HTML login page instead of CSV
    if (csvText.trim().toLowerCase().startsWith('<!doctype html>') || csvText.includes('<html')) {
      throw new Error('This Google Sheet is PRIVATE. Please set sharing to "Anyone with the link can view".');
    }

    // Parse CSV to JSON — trim headers to fix trailing spaces
    const parsed = Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (header: string) => header.trim(),
    });

    return parsed.data as Record<string, string>[];
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}
