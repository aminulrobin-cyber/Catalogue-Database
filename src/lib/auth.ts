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
      // Block any email that isn't from the allowed domain
      const email = user.email || '';
      if (email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        return true;
      }
      return false; // Deny sign-in
    },
    async session({ session, token }) {
      // Attach user info to the session
      if (token && session.user) {
        session.user.id = token.sub || '';
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
