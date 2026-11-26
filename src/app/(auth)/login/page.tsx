'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { safeNextPath } from '@/lib/navigation/safe-redirect';
import { mapLoginError } from '@/lib/auth/login-error-map';
import { PublicHeader } from '@/components/public/PublicHeader';
import { PublicFooter } from '@/components/public/PublicFooter';
import { Mail, ArrowRight, Loader2 } from 'lucide-react';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rawNext = searchParams.get('next') ?? searchParams.get('redirectTo') ?? searchParams.get('returnTo');
  const safeNext = safeNextPath(rawNext, '/dashboard');

  const initialMappedError = mapLoginError({
    error: searchParams.get('error'),
    errorCode: searchParams.get('error_code'),
    errorDescription: searchParams.get('error_description'),
  });

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(
    initialMappedError ? { text: initialMappedError, error: true } : null
  );

  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        router.replace('/dashboard');
      }
    });
  }, [supabase, router]);

  useEffect(() => {
    const hashParams = new URLSearchParams(
      typeof window !== 'undefined' && window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : ''
    );
    const hashErr = hashParams.get('error');
    const hashErrCode = hashParams.get('error_code');
    const hashErrDesc = hashParams.get('error_description');

    const mappedHash = mapLoginError({
      error: hashErr,
      errorCode: hashErrCode,
      errorDescription: hashErrDesc,
    });

    if (mappedHash) {
      queueMicrotask(() => setMessage({ text: mappedHash, error: true }));
    }

    // Scrub sensitive or noisy error/token parameters from the URL
    if (
      typeof window !== 'undefined' &&
      (searchParams.has('error') ||
        searchParams.has('error_code') ||
        searchParams.has('error_description') ||
        searchParams.has('code') ||
        window.location.hash.includes('access_token') ||
        window.location.hash.includes('error'))
    ) {
      const cleanParams = new URLSearchParams();
      if (rawNext) {
        cleanParams.set('next', safeNext);
      }
      const query = cleanParams.toString();
      window.history.replaceState(null, '', `/login${query ? `?${query}` : ''}`);
    }
  }, [searchParams, rawNext, safeNext]);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setMessage(null);

    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: callbackUrl,
      },
    });

    if (error) {
      const mapped = mapLoginError({
        error: error.code,
        errorCode: error.code,
        errorDescription: error.message,
      });
      setMessage({ text: mapped || 'Sign-in could not be completed. Please try again.', error: true });
    } else {
      setMessage({
        text: 'A secure sign-in link has been sent to your email address.',
        error: false,
      });
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setLoading(true);
    const callbackUrl = `${window.location.origin}/auth/callback?next=${encodeURIComponent(safeNext)}`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: callbackUrl,
      },
    });
    if (error) {
      const mapped = mapLoginError({
        error: error.code,
        errorCode: error.code,
        errorDescription: error.message,
      });
      setMessage({ text: mapped || 'Sign-in could not be completed. Please try again.', error: true });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between relative text-[#0B0B0B]">
      {/* Shared Public Header */}
      <div className="pt-4 sm:pt-8">
        <PublicHeader />
      </div>

      {/* Main Authentication Card Panel */}
      <main className="max-w-md w-full mx-auto px-4 sm:px-0 my-auto py-8">
        <div className="bg-[#FFFFFF] border border-[#6B6B6B] rounded-2xl p-6 sm:p-10 shadow-md">
        <div className="mb-6">
          <h1 className="font-display text-2xl sm:text-3xl font-bold text-[#0B0B0B] tracking-tight">
            Sign in
          </h1>
          <p className="text-xs sm:text-sm text-[#333333] mt-1.5 leading-relaxed">
            One master profile for your Resume and Academic CV.
          </p>
        </div>

        {message && (
          <div
            role="alert"
            className={`p-3.5 rounded-lg mb-6 text-xs font-semibold border ${
              message.error
                ? 'bg-[#FFE4D8] text-[#800021] border-[#800021]'
                : 'bg-[#DAF1DE] text-[#051F20] border-[#235347]'
            }`}
          >
            {message.text}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          aria-busy={loading}
          className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] hover:bg-[#F1F7F7] font-semibold text-xs transition-colors mb-5 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 min-h-[44px]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-[#800021]" aria-hidden="true" />
              <span>Connecting to Google...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
              <span>Continue with Google</span>
            </>
          )}
        </button>

        <div className="relative mb-5 flex items-center justify-center">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#6B6B6B]"></div>
          </div>
          <span className="relative bg-[#FFFFFF] px-3 text-[11px] font-bold text-[#6B6B6B] uppercase tracking-wider">
            Or with email
          </span>
        </div>

        <form onSubmit={handleEmailSignIn} className="space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-semibold uppercase tracking-wider text-[#0B0B0B] mb-1.5"
            >
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
                className="w-full px-3.5 py-2.5 rounded-lg border border-[#6B6B6B] bg-[#FFFFFF] text-[#0B0B0B] text-xs placeholder:text-[#6B6B6B] focus:outline-none focus:ring-2 focus:ring-[#800021] transition-colors"
              />
              <Mail className="w-4 h-4 text-[#6B6B6B] absolute right-3.5 top-3.5 pointer-events-none" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            aria-busy={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-[#800021] hover:bg-[#881144] text-[#FFFFFF] font-semibold text-xs shadow-xs hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-[#800021] focus:ring-offset-2 transition-colors disabled:opacity-50 min-h-[44px]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
                <span>Sending Magic Link...</span>
              </>
            ) : (
              <>
                <span>Send Magic Link</span>
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-[11px] text-center text-[#333333] leading-relaxed">
          By signing in, you agree to store your career and academic facts securely. We never use your profile data to train public models.
        </p>
        </div>
      </main>

      {/* Shared Public Footer */}
      <PublicFooter />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen" />}>
      <LoginForm />
    </Suspense>
  );
}
