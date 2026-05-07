import { z } from "zod";

export interface SheetRow {
  date: Date;
  subject: string;
  topic: string;
  teacher: string;
  batch: string;
  liveClassId: string;
  videoUrl: string | null;
  pdfUrl: string | null;
  uploader: string;
}

// Updated schema to parse cell data which contains the hyperlinks
const cellDataSchema = z.object({
  formattedValue: z.string().optional(),
  hyperlink: z.string().optional(),
});

const googleSheetsResponseSchema = z.object({
  sheets: z.array(
    z.object({
      data: z.array(
        z.object({
          rowData: z.array(
            z.object({
              values: z.array(cellDataSchema.optional().nullable()).optional(),
            })
          ).optional(),
        })
      ).optional(),
    })
  ).optional(),
});

function normalizeDate(raw: string): Date | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (!slashMatch) return null;

  const [, d, m, y] = slashMatch;
  const year = y.length === 2 ? `20${y}` : y;
  const fallback = new Date(`${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function normalizeUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  // This verifies if the extracted content is actually a link
  if (value.startsWith("http://") || value.startsWith("https://")) return value;
  return null;
}

export function parseSheetRows(rows: string[][]): SheetRow[] {
  return rows
    .map((row) => {
      const [
        dateRaw = "",
        subject = "",
        topic = "",
        teacher = "",
        batch = "",
        liveClassId = "",
        videoUrlRaw = "",
        pdfUrlRaw = "",
        uploader = "",
      ] = row;

      const date = normalizeDate(dateRaw);
      const normalizedClassId = liveClassId.trim();
      if (!date || !normalizedClassId) {
        return null;
      }

      return {
        date,
        subject: subject.trim(),
        topic: topic.trim(),
        teacher: teacher.trim(),
        batch: batch.trim(),
        liveClassId: normalizedClassId,
        videoUrl: normalizeUrl(videoUrlRaw),
        pdfUrl: normalizeUrl(pdfUrlRaw),
        uploader: uploader.trim(),
      } satisfies SheetRow;
    })
    .filter((entry): entry is SheetRow => Boolean(entry));
}

export function extractSheetId(url: string): string | null {
  if (!url) return null;
  const match = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
  // If it matches a URL pattern, return the ID. Otherwise, assume the input might already be the raw ID.
  return match ? match[1] : url;
}

export async function fetchSheetValues(
  sheetIdOrUrl: string, 
  range: string = "A:ZZ", 
  apiKey: string = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || ""
): Promise<string[][]> {
  const sheetId = extractSheetId(sheetIdOrUrl) || sheetIdOrUrl;

  // If a default tab name is configured and the range doesn't already specify one, prepend it
  const defaultTab = process.env.DEFAULT_SHEET_TAB || '';
  let finalRange = range;
  if (defaultTab && !range.includes('!')) {
    finalRange = `'${defaultTab}'!${range}`;
  }

  // Switched to the main spreadsheets endpoint to access cell-level formatting (hyperlinks)
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`
  );
  url.searchParams.set("ranges", finalRange);
  // Field mask to strictly fetch only the visible text and the hyperlink URL to keep the payload lightweight
  url.searchParams.set("fields", "sheets.data.rowData.values(formattedValue,hyperlink)");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Google Sheets API failed (${response.status}) for ${sheetId}`);
  }

  const body = await response.json();
  const parsed = googleSheetsResponseSchema.safeParse(body);
  if (!parsed.success) {
    throw new Error("Google Sheets API returned invalid payload.");
  }

  // Use deeply nested optional chaining to prevent strict TS index errors
  const rowData = parsed.data.sheets?.[0]?.data?.[0]?.rowData;
  
  if (!rowData) {
    return [];
  }

  // Reconstruct the 2D array of strings, substituting the hyperlink URL if it exists
  return rowData.map((row) => {
    if (!row.values) return [];
    
    return row.values.map((cell) => {
      if (!cell) return "";
      // Prioritize the actual hyperlink URL. Fallback to the regular text if no link is embedded.
      return cell.hyperlink || cell.formattedValue || "";
    });
  });
}

export async function fetchSheetTitle(
  sheetIdOrUrl: string, 
  apiKey: string = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || ""
): Promise<string> {
  const sheetId = extractSheetId(sheetIdOrUrl) || sheetIdOrUrl;
  
  const url = new URL(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`);
  url.searchParams.set("fields", "properties.title");
  url.searchParams.set("key", apiKey);

  const response = await fetch(url.toString(), { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to fetch title for sheet ${sheetId}`);
  }

  const body = await response.json();
  return body.properties?.title || "Untitled Sheet";
}

export async function fetchSheetData(
  sheetIdOrUrl: string, 
  range: string = "A:ZZ", 
  apiKey: string = process.env.GOOGLE_API_KEY || process.env.GOOGLE_SHEETS_API_KEY || ""
): Promise<Record<string, string>[]> {
  // Use our existing values fetcher that cleanly handles formatting and hyperlinks
  const values = await fetchSheetValues(sheetIdOrUrl, range, apiKey);
  if (!values || values.length === 0) return [];

  // Extract the top row as the column headers
  const headers = values[0];
  const rows = values.slice(1);

  // Map each subsequent row to an object using the header text as the keys
  return rows.map((row) => {
    const record: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        record[header] = row[index] || "";
      }
    });
    return record;
  });
}
