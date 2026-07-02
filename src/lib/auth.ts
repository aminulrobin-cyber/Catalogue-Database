import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';
import connectToDatabase from '@/lib/mongoose';
import User from '@/models/User';

// Only allow @shikho.com emails
const ALLOWED_DOMAIN = 'shikho.com';

// Primary admin — can never be demoted
const PRIMARY_ADMIN = 'aminul.robin@shikho.com';

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = (user.email || '').toLowerCase().trim();

      // HARD BLOCK: Only @shikho.com emails allowed
      if (!email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return false; // Deny sign-in
      }

      // Upsert user record in MongoDB
      try {
        await connectToDatabase();
        const existingUser = await User.findOne({ email });

        if (existingUser) {
          // Update login info
          existingUser.last_login = new Date();
          existingUser.login_count += 1;
          existingUser.name = user.name || existingUser.name;
          existingUser.image = user.image || existingUser.image;
          await existingUser.save();
        } else {
          // First-time user — primary admin gets admin role, everyone else is viewer
          await User.create({
            email,
            name: user.name || '',
            image: user.image || '',
            role: email === PRIMARY_ADMIN ? 'admin' : 'viewer',
            last_login: new Date(),
            login_count: 1,
          });
        }
      } catch (err) {
        console.error('Error saving user on sign-in:', err);
        // Still allow login even if DB write fails
      }

      return true;
    },

    async jwt({ token, user }) {
      if (user) {
        token.email = (user.email || '').toLowerCase().trim();
      }

      // Fetch role from DB on every token refresh
      if (token.email) {
        try {
          await connectToDatabase();
          const dbUser = await User.findOne({ email: token.email }).lean();
          token.role = dbUser?.role || 'viewer';
        } catch {
          token.role = 'viewer';
        }
      }

      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || '';
        (session.user as any).role = token.role || 'viewer';
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
  },
});
