import { z } from "zod";

import type { SheetRow } from "@/lib/types";

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

export async function fetchSheetValues(sheetId: string, range: string, apiKey: string): Promise<string[][]> {
  // Switched to the main spreadsheets endpoint to access cell-level formatting (hyperlinks)
  const url = new URL(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}`
  );
  url.searchParams.set("ranges", range);
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

  const sheets = parsed.data.sheets;
  if (!sheets || !sheets[0]?.data || !sheets[0].data[0]?.rowData) {
    return [];
  }

  // Reconstruct the 2D array of strings, substituting the hyperlink URL if it exists
  return sheets[0].data[0].rowData.map((row) => {
    if (!row.values) return [];
    
    return row.values.map((cell) => {
      if (!cell) return "";
      // Prioritize the actual hyperlink URL. Fallback to the regular text if no link is embedded.
      return cell.hyperlink || cell.formattedValue || "";
    });
  });
}
