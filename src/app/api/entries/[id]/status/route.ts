import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/mongoose';
import Entry from '@/models/Entry';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { status } = await request.json();

    // Validate status value
    const validStatuses = ['ok', 'pending', 'error'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      );
    }

    await connectToDatabase();

    // Update the entry with the new status and mark as manually overridden
    const updated = await Entry.findByIdAndUpdate(
      id,
      { 
        status, 
        status_override: true,
      },
      { new: true }
    ).lean();

    if (!updated) {
      return NextResponse.json(
        { error: 'Entry not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: updated });
  } catch (error: any) {
    console.error('Status Update Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
