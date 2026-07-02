import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

const PRIMARY_ADMIN = 'aminul.robin@shikho.com';

// GET: Returns the current user's profile and role
// Also upserts the user record on every call (tracks logins)
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const email = session.user.email.toLowerCase().trim();

    await connectToDatabase();

    let user = await User.findOne({ email });

    if (user) {
      // Update login info
      user.last_login = new Date();
      user.login_count += 1;
      user.name = session.user.name || user.name;
      user.image = session.user.image || user.image;
      await user.save();
    } else {
      // First-time user
      user = await User.create({
        email,
        name: session.user.name || '',
        image: session.user.image || '',
        role: email === PRIMARY_ADMIN ? 'admin' : 'viewer',
        last_login: new Date(),
        login_count: 1,
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        name: user.name,
        image: user.image,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Me API Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
