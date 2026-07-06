import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const PRIMARY_ADMIN = 'aminul.robin@shikho.com';

// GET: List all users (admin only)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const requestingUser = await User.findOne({ email: session.user.email.toLowerCase() }).lean();
    
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const users = await User.find({}).sort({ last_login: -1 }).lean();
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH: Update a user's role (admin only)
export async function PATCH(request: Request) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectToDatabase();
    const requestingUser = await User.findOne({ email: session.user.email.toLowerCase() }).lean();
    
    if (!requestingUser || requestingUser.role !== 'admin') {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { userId, role } = await request.json();

    if (!['admin', 'viewer'].includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Find the target user
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Cannot demote the primary admin
    if (targetUser.email === PRIMARY_ADMIN && role !== 'admin') {
      return NextResponse.json({ error: 'Cannot change the primary admin role' }, { status: 403 });
    }

    targetUser.role = role;
    targetUser.admin_request = false;
    await targetUser.save();

    return NextResponse.json({ success: true, data: targetUser });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
