import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Entry from '@/models/Entry';

export const dynamic = 'force-dynamic'; // Prevent static caching

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const filter: any = {};
    
    // Quick error filter from the "Show Only Errors" toggle if passed
    const errorsOnly = searchParams.get('errorsOnly');
    if (errorsOnly === 'true') {
      filter.$or = [
        { video_status: 'broken' },
        { pdf_status: 'broken' },
        { status: 'error' }
      ];
    }
    
    const sheetId = searchParams.get('sheet_id');
    if (sheetId) {
      filter.sheet_id = sheetId;
    }
    
    await connectToDatabase();
    
    // Fetch all entries. We lean() to get raw JS objects.
    const entries = await Entry.find(filter).sort({ updated_at: -1, created_at: -1 }).lean();

    return NextResponse.json({ success: true, data: entries });
  } catch (error: any) {
    console.error('Entries API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
