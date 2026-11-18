'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { PRODUCT_NAME } from '@/config/app';
import { ThemeSwitcher } from '@/components/theme/ThemeSwitcher';
import { ArrowRight, Mail } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);

  const supabase = createClient();

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    setLoading(false);
    if (error) {
      setMessage({ text: error.message, error: true });
    } else {
      setMessage({
        text: 'A magic link has been sent to your email. Check your inbox to sign in.',
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) {
      setMessage({ text: error.message, error: true });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-6 sm:p-12">
      <header className="flex items-center justify-between max-w-5xl mx-auto w-full pb-8 border-b border-[var(--border-muted)]">
        <Link href="/" className="font-display text-2xl font-bold tracking-tight text-[var(--text)]">
          {PRODUCT_NAME}
        </Link>
        <ThemeSwitcher />
      </header>

      <main className="max-w-md w-full mx-auto my-12 bg-[var(--surface)] border border-[var(--border)] rounded-lg p-8 sm:p-10 shadow-sm">
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-[var(--text)] tracking-tight">
            Sign in
          </h1>
          <p className="text-sm text-[var(--text-muted)] mt-2">
            One master profile for your Resume, Academic CV, and public site.
          </p>
        </div>

        {message && (
          <div
            className={`p-4 rounded-md mb-6 text-sm border ${
              message.error
                ? 'bg-red-50 text-red-900 border-red-200'
                : 'bg-emerald-50 text-emerald-900 border-emerald-200'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] hover:bg-[var(--surface-alt)] font-medium text-sm transition-colors mb-6 disabled:opacity-50"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="relative mb-6 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[var(--border-muted)]"></div>
          </div>
          <span className="relative bg-[var(--surface)] px-3 text-xs text-[var(--text-muted)] uppercase tracking-wider">
            Or with email
          </span>
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] mb-1.5">
              Email Address
            </label>
            <div className="relative">
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@university.edu or you@work.com"
                required
                className="w-full px-3.5 py-2.5 rounded-md border border-[var(--border)] bg-[var(--surface)] text-[var(--text)] text-sm placeholder:text-[var(--text-muted)] focus:border-[var(--accent)] transition-colors"
              />
              <Mail className="w-4 h-4 text-[var(--text-muted)] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-md bg-[var(--accent)] text-[var(--surface)] font-medium text-sm hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {loading ? 'Sending link...' : 'Send Magic Link'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <p className="mt-8 text-xs text-center text-[var(--text-muted)] leading-relaxed">
          By signing in, you agree to store your career and academic facts securely. We never use your profile data to train public models.
        </p>
      </main>

      <footer className="text-center text-xs text-[var(--text-muted)] py-6">
        {PRODUCT_NAME} &bull; Editorial Profile &amp; Document Engine
      </footer>
    </div>
  );
}
