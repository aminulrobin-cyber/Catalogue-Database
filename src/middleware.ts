export { auth as middleware } from '@/lib/auth';

export const config = {
  // Protect all routes EXCEPT auth endpoints and static assets
  matcher: [
    '/((?!api/auth|_next/static|_next/image|favicon.ico).*)',
  ],
};
