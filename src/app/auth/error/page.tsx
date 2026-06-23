'use client';

import Link from 'next/link';
import { XCircle } from 'lucide-react';

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-paper p-4">
      <div className="w-full max-w-md text-center space-y-8">
        <div className="bg-white rounded-2xl shadow-ambient p-8 space-y-6">
          <div className="w-16 h-16 rounded-full bg-brand-coral-light mx-auto flex items-center justify-center">
            <XCircle className="w-8 h-8 text-brand-coral" />
          </div>
          <div className="space-y-2">
            <h1 className="text-2xl font-bold text-ink">Access Denied</h1>
            <p className="text-sm text-ink-secondary leading-relaxed">
              Your Google account is not authorized to access this dashboard.
              Only <strong className="text-brand-indigo">@shikho.com</strong> accounts are allowed.
            </p>
          </div>
          <Link
            href="/auth/signin"
            className="inline-flex items-center justify-center px-6 py-3 bg-brand-indigo hover:bg-brand-indigo-dark text-white rounded-xl font-bold transition-hover"
          >
            Try a different account
          </Link>
        </div>
      </div>
    </div>
  );
}
