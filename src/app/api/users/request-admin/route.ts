import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();

    await connectToDatabase();

    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    user.admin_request = true;
    await user.save();

    return NextResponse.json({ success: true, data: { admin_request: true } });
  } catch (error: any) {
    console.error('Request Admin API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
