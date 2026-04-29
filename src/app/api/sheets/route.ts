import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import SheetTracker from '@/models/SheetTracker';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await connectToDatabase();
    const sheets = await SheetTracker.find({}).sort({ last_synced: -1 }).lean();
    return NextResponse.json({ success: true, data: sheets });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
