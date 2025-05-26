'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signInWithPopup, sendSignInLinkToEmail } from 'firebase/auth';
import { auth, googleProvider, actionCodeSettings } from '@/lib/firebase';
import { Coins, Wallet, Brain, MessageSquare } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      router.push('/app');
    } catch (err: any) {
      setError('Google sign-in failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Magic Link
  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      setMessage('Check your email for a magic link to sign in.');
    } catch (err: any) {
      if (err.code === 'auth/operation-not-allowed') {
        setError('Magic link sign-in is not enabled. Please contact support.');
      } else {
        setError('Failed to send magic link. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-between bg-neutral-50">
      <div className="flex flex-1 min-h-[80vh] w-full items-center justify-center">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-200">
          {/* Left Info Column */}
          <div className="hidden md:flex flex-col justify-center px-10 py-14 bg-gradient-to-br from-neutral-100 to-neutral-50 border-r border-gray-100">
            <button
              className="mb-10 text-left focus:outline-none"
              onClick={() => router.push('/')}
              tabIndex={0}
              aria-label="Go to home"
            >
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl">
                  <Coins className="w-7 h-7 text-emerald-600" />
                </div>
                <span className="text-2xl font-bold bg-gradient-to-r from-gray-800 via-gray-700 to-emerald-600 bg-clip-text text-transparent">Caishen App</span>
              </div>
              <div className="text-xs text-gray-500 ml-1">Smart Finance</div>
            </button>
            <ul className="space-y-8">
              <li className="flex items-start gap-4">
                <Wallet className="w-6 h-6 text-emerald-500 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">Expense Control</div>
                  <div className="text-gray-500 text-sm">Track and categorize your expenses automatically.</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Brain className="w-6 h-6 text-emerald-500 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">AI Insights</div>
                  <div className="text-gray-500 text-sm">Get smart suggestions to improve your finances.</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <MessageSquare className="w-6 h-6 text-emerald-500 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">WhatsApp Integration</div>
                  <div className="text-gray-500 text-sm">Receive instant updates and reminders via WhatsApp.</div>
                </div>
              </li>
              <li className="flex items-start gap-4">
                <Coins className="w-6 h-6 text-emerald-500 mt-1" />
                <div>
                  <div className="font-semibold text-gray-900">Free & Pro Plans</div>
                  <div className="text-gray-500 text-sm">Start for free, upgrade anytime for more features.</div>
                </div>
              </li>
            </ul>
          </div>

          {/* Right Login Card */}
          <div className="flex flex-col justify-center px-8 py-14 md:px-12 bg-white">
            {/* Heading */}
            <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Sign in to Caishen App</h2>
            <p className="text-sm text-gray-500 mb-8 text-center">Welcome back! Choose your preferred sign-in method.</p>

            {/* Google Sign In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-neutral-900 text-white font-medium text-base shadow hover:bg-neutral-800 transition-colors mb-6 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.64 2.7 30.27 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.19C12.13 13.41 17.56 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.93 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 010-8.56l-7.98-6.19A23.94 23.94 0 000 24c0 3.77.9 7.34 2.69 10.47l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.27 0 11.54-2.07 15.38-5.63l-7.19-5.59c-2.01 1.35-4.59 2.15-8.19 2.15-6.44 0-11.87-3.91-13.33-9.28l-7.98 6.19C6.71 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center w-full my-4">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="mx-3 text-xs text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Magic Link Form */}
            <form onSubmit={handleMagicLink} className="w-full">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Sign in with Magic Link
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-emerald-500 focus:ring-emerald-500 outline-none text-gray-900 bg-white mb-4 transition"
                disabled={isLoading}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 rounded-lg bg-neutral-900 text-white font-medium text-base shadow hover:bg-neutral-800 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>

            {/* Error/Message */}
            {error && <div className="mt-4 text-sm text-red-600 text-center">{error}</div>}
            {message && <div className="mt-4 text-sm text-emerald-600 text-center">{message}</div>}
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="w-full border-t border-gray-200 bg-white/80">
        <footer className="w-full max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div>© 2024 Caishen App</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-emerald-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-emerald-600 transition-colors">Terms of Service</a>
          </div>
        </footer>
      </div>
    </div>
  );
} 