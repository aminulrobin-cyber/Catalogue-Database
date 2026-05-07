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

// Normalize a link value — keep actual URLs, mark display text like "Link" as the text itself
function normalizeLink(raw: string): string {
  const val = raw.trim();
  if (!val) return '';
  // If it's already a real URL, return as-is
  if (val.startsWith('http://') || val.startsWith('https://')) return val;
  // Otherwise return the raw text (e.g. "Link") — the UI will show this as pending
  return val;
}

// Compute link status: ok = valid URL, pending = has text but not a URL, broken = empty
function getLinkStatus(link: string): 'ok' | 'pending' | 'broken' {
  if (!link) return 'broken';
  if (link.startsWith('http://') || link.startsWith('https://')) return 'ok';
  return 'pending'; // Has text like "Link" but no actual URL
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
        
        // Cache existing class_ids to mark duplicates across syncs
        const existingEntries = await Entry.find({}, { class_id: 1, sheet_id: 1 });
        const existingClassIds = new Set(existingEntries.map(e => e.class_id));
        const currentBatchClassIds = new Set();

        const processedRows = [];
        let errorCount = 0;

        // Process in chunks to avoid overwhelming memory
        const chunkSize = 20;
        for (let i = 0; i < rows.length; i += chunkSize) {
          const chunk = rows.slice(i, i + chunkSize);
          
          const promises = chunk.map(async (row, index) => {
            let class_id = getColumnValue(row, ['Live Class ID', 'Class ID', 'id', 'class id', 'ClassId', 'Live Class Id']);
            
            // NEVER skip a row. If it has no ID, generate one.
            if (!class_id) {
               const rowString = Object.values(row).join('').trim();
               if (!rowString) return null; // Only skip if the ENTIRE row is completely blank
               class_id = `missing-id-${Date.now()}-${i + index}`;
            }

            // Keep date as the raw string from the sheet (e.g. "11-Jan-2026")
            const date = getColumnValue(row, ['Date', 'date', 'Time', 'Day']);
            const subject = getColumnValue(row, ['Subject', 'subject', 'Sub']);
            const chapter = getColumnValue(row, ['Chapter/Topic Name', 'Chapter', 'Topic Name', 'Topic', 'Title', 'Class Name']);
            const teacher = getColumnValue(row, ['Teacher', 'Instructor', 'Tutor']);
            const batch = getColumnValue(row, ['Batch Name', 'Batch', 'Program']);
            const video_link = normalizeLink(getColumnValue(row, ['Video Link', 'Video', 'Class Link', 'Link']));
            const pdf_link = normalizeLink(getColumnValue(row, ['PDF Link', 'PDF', 'Pdf', 'PDf', 'Slide Link', 'Note']));
            const uploader = getColumnValue(row, ['Uploader Name', 'Uploader', "Uploader's Name"]);

            // Compute status based on whether links are real URLs or just display text
            const video_status = getLinkStatus(video_link);
            const pdf_status = getLinkStatus(pdf_link);
            const status = (video_status === 'ok' && pdf_status === 'ok') ? 'ok' 
              : (video_status === 'broken' || pdf_status === 'broken') ? 'error' 
              : 'pending';

            if (status === 'error') errorCount++;
            
            let isDuplicate = false;
            const alreadyInDb = existingClassIds.has(class_id);
            const alreadyInBatch = currentBatchClassIds.has(class_id);
            
            if (alreadyInBatch) {
              isDuplicate = true;
            } else if (alreadyInDb) {
              const originalFromThisSheet = existingEntries.find(e => e.class_id === class_id && e.sheet_id === sheetId);
              if (!originalFromThisSheet) {
                isDuplicate = true; 
              }
            }
            
            currentBatchClassIds.add(class_id);

            return {
              date, subject, chapter, teacher, batch, class_id,
              video_link, pdf_link, uploader, sheet_id: sheetId,
              video_status, pdf_status, status, duplicate: isDuplicate
            };
          });

          const chunkResults = await Promise.all(promises);
          processedRows.push(...chunkResults.filter(Boolean));
        }

        // Upsert SheetTracker
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

        // Upsert Entries
        const bulkOps = processedRows.map((row: any) => ({
          updateOne: {
            filter: { class_id: row.class_id, sheet_id: sheetId },
            update: { $set: row },
            upsert: true
          }
        }));

        if (bulkOps.length > 0) {
          await Entry.bulkWrite(bulkOps);
        }

        results.push({ url, title, status: 'success', rowsProcessed: processedRows.length, errors: errorCount });
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
