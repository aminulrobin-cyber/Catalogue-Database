import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Entry from '@/models/Entry';
import SheetTracker from '@/models/SheetTracker';
import { fetchSheetData, fetchSheetTitle, extractSheetId } from '@/lib/googleSheets';

function getColumnValue(row: Record<string, string>, possibleNames: string[]): string {
  for (const name of possibleNames) {
    if (row[name] !== undefined) return row[name].trim();
    // Try case-insensitive matching
    const key = Object.keys(row).find(k => k.toLowerCase() === name.toLowerCase());
    if (key) return row[key].trim();
  }
  return '';
}

// Parse a date string like "11-Jan-2026" into a JS Date object for sorting
// Returns null if the string is not a valid date (filters out "Q-3", "Q-2", headers, etc.)
function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // Reject obvious non-date values like "Q-3", "Q-2", section headers
  if (/^[A-Z]-?\d/i.test(trimmed)) return null;
  if (/^Q-?\d/i.test(trimmed)) return null;

  // Try native Date parsing (handles "11-Jan-2026", "2026-01-11", etc.)
  const parsed = new Date(trimmed);
  if (!Number.isNaN(parsed.getTime()) && parsed.getFullYear() > 2000) {
    return parsed;
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const slashMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    const year = y.length === 2 ? `20${y}` : y;
    const fallback = new Date(`${year}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`);
    if (!Number.isNaN(fallback.getTime())) return fallback;
  }

  return null;
}

// Normalize a link value
function normalizeLink(raw: string): string {
  const val = raw.trim();
  if (!val) return '';
  return val;
}

// Compute link status
function getLinkStatus(link: string): 'ok' | 'pending' | 'broken' {
  if (!link) return 'broken';
  if (link.startsWith('http://') || link.startsWith('https://')) return 'ok';
  return 'pending';
}

export async function POST(request: Request) {
  try {
    const { urls } = await request.json();
    
    if (!urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Please provide an array of URLs' }, { status: 400 });
    }

    await connectToDatabase();

    const results = [];

    for (const url of urls) {
      try {
        const sheetId = extractSheetId(url);
        if (!sheetId) throw new Error('Invalid URL');

        // Fetch title and rows
        const [title, rows] = await Promise.all([
          fetchSheetTitle(url),
          fetchSheetData(url)
        ]);
        
        // ── Load existing entries to preserve manual status overrides ──
        const existingEntries = await Entry.find({ sheet_id: sheetId }).lean();
        const existingByClassId = new Map<string, any>();
        for (const e of existingEntries) {
          existingByClassId.set(e.class_id, e);
        }

        const currentBatchClassIds = new Set();
        const processedRows = [];
        let errorCount = 0;
        let skippedCount = 0;

        for (let i = 0; i < rows.length; i++) {
          const row = rows[i];

          // ── STEP 1: Validate the date ──
          const dateRaw = getColumnValue(row, ['Date', 'date', 'Time', 'Day']);
          const dateParsed = parseDate(dateRaw);
          
          if (!dateParsed) {
            skippedCount++;
            continue;
          }

          // ── STEP 2: Get Class ID ──
          let class_id = getColumnValue(row, ['Live Class ID', 'Class ID', 'id', 'class id', 'ClassId', 'Live Class Id']);
          if (!class_id) {
            class_id = `auto-${sheetId.substring(0, 6)}-${i}`;
          }

          // ── STEP 3: Extract all fields ──
          const subject = getColumnValue(row, ['Subject', 'subject', 'Sub']);
          const chapter = getColumnValue(row, ['Chapter/Topic Name', 'Chapter', 'Topic Name', 'Topic', 'Title', 'Class Name']);
          const teacher = getColumnValue(row, ['Teacher', 'Instructor', 'Tutor']);
          const batch = getColumnValue(row, ['Batch Name', 'Batch', 'Program']);
          const video_link = normalizeLink(getColumnValue(row, ['Video Link', 'Video', 'Class Link']));
          const pdf_link = normalizeLink(getColumnValue(row, ['PDF Link', 'PDF', 'Pdf', 'PDf', 'Slide Link', 'Note']));
          const uploader = getColumnValue(row, ['Uploader Name', 'Uploader', "Uploader's Name"]);

          // ── STEP 4: Compute auto statuses ──
          const video_status = getLinkStatus(video_link);
          const pdf_status = getLinkStatus(pdf_link);
          const autoStatus = (video_status === 'ok' && pdf_status === 'ok') ? 'ok' 
            : (video_status === 'broken' || pdf_status === 'broken') ? 'error' 
            : 'pending';

          // ── STEP 5: Respect manual status overrides ──
          const existing = existingByClassId.get(class_id);
          let finalStatus = autoStatus;
          let statusOverride = false;
          
          if (existing && existing.status_override) {
            // Admin manually set this status — preserve it
            finalStatus = existing.status;
            statusOverride = true;
          }

          if (finalStatus === 'error') errorCount++;
          
          // ── STEP 6: Check duplicates ──
          let isDuplicate = currentBatchClassIds.has(class_id);
          currentBatchClassIds.add(class_id);

          processedRows.push({
            date: dateRaw,
            date_sort: dateParsed,
            subject, chapter, teacher, batch, class_id,
            video_link, pdf_link, uploader, sheet_id: sheetId,
            video_status, pdf_status, 
            status: finalStatus,
            status_override: statusOverride,
            duplicate: isDuplicate
          });
        }

        // ── STEP 7: Delete old entries and insert fresh data ──
        await Entry.deleteMany({ sheet_id: sheetId });
        
        if (processedRows.length > 0) {
          await Entry.insertMany(processedRows);
        }

        // ── STEP 8: Update SheetTracker ──
        await SheetTracker.findOneAndUpdate(
          { sheet_id: sheetId },
          { 
            title, 
            url, 
            total_entries: processedRows.length,
            error_count: errorCount,
            last_synced: new Date()
          },
          { upsert: true, new: true }
        );

        results.push({ 
          url, title, status: 'success', 
          rowsProcessed: processedRows.length, 
          rowsSkipped: skippedCount,
          errors: errorCount 
        });
      } catch (error: any) {
        results.push({ url, status: 'error', message: error.message });
      }
    }

    return NextResponse.json({ success: true, results });

  } catch (error: any) {
    console.error('Sync API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
