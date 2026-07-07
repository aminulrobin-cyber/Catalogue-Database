import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import SheetTracker from '@/models/SheetTracker';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    await connectToDatabase();
    const sheetId = params.id;
    
    const body = await request.json();
    const { is_previous_year } = body;
    
    const updatedSheet = await SheetTracker.findOneAndUpdate(
      { sheet_id: sheetId },
      { $set: { is_previous_year } },
      { new: true }
    );
    
    if (!updatedSheet) {
      return NextResponse.json({ success: false, error: 'Sheet not found' }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, data: updatedSheet });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
