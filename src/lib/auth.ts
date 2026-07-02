import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

// Only allow @shikho.com emails
const ALLOWED_DOMAIN = 'shikho.com';

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
        return false;
      }
      return true;
    },

    async jwt({ token, user, trigger }) {
      if (user) {
        token.email = (user.email || '').toLowerCase().trim();
        token.name = user.name || '';
        token.picture = user.image || '';
      }
      // Role is fetched from DB via /api/me — NOT in the token
      // This avoids MongoDB calls in Edge middleware
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.sub || '';
        session.user.email = (token.email as string) || '';
      }
      return session;
    },

    async authorized({ auth: session, request }) {
      const isLoggedIn = !!session?.user;
      const isAuthRoute = request.nextUrl.pathname.startsWith('/api/auth') ||
                          request.nextUrl.pathname.startsWith('/auth/');
      
      if (isAuthRoute) return true; // Always allow auth routes
      if (!isLoggedIn) return false; // Block unauthenticated users
      return true;
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
