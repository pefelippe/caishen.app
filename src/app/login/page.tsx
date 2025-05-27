'use client';

import { useState } from 'react';
import { signInWithPopup, sendSignInLinkToEmail } from 'firebase/auth';
import { auth, googleProvider, actionCodeSettings } from '@/lib/firebase';
import Link from 'next/link';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // Handle Google Sign In
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    try {
      await signInWithPopup(auth, googleProvider);
      window.location.href = '/app'; // fallback, since Link can't be used in handler
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

  // Handle Password Sign In (placeholder)
  const handlePasswordSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setMessage('');
    // TODO: Implement password sign in logic
    setTimeout(() => {
      setIsLoading(false);
      setError('Password sign-in is not implemented in this demo.');
    }, 1000);
  };

  return (
    <div className="min-h-screen flex flex-col bg-neutral-50">
      {/* Simple Header */}
      <header className="w-full py-6 flex justify-start items-center w-full max-w-5xl mx-auto ">
        <Link href="/" className="text-2xl font-extrabold text-gray-900 hover:text-indigo-600 transition-colors focus:outline-none">
          Caishen
        </Link>
      </header>
      {/* Centered Login Card */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md mx-auto bg-white rounded-2xl shadow-xl border border-gray-200 p-8 animate-fade-in-up">
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Sign in to your account</h2>
          <form onSubmit={handlePasswordSignIn} className="space-y-4 mt-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 outline-none text-gray-900 bg-white transition"
                disabled={isLoading}
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                id="password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full px-4 py-3 rounded-lg border border-gray-200 focus:border-indigo-500 focus:ring-indigo-500 outline-none text-gray-900 bg-white transition"
                disabled={isLoading}
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 px-4 rounded-lg bg-indigo-600 text-white font-medium text-base shadow hover:bg-indigo-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
          {/* Divider */}
          <div className="flex items-center w-full my-6">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="mx-3 text-xs text-gray-400">or</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>
          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-lg bg-white border border-gray-200 text-gray-900 font-medium text-base shadow-sm hover:bg-gray-50 transition-colors mb-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 48 48"><g><path fill="#4285F4" d="M24 9.5c3.54 0 6.7 1.22 9.19 3.61l6.85-6.85C35.64 2.7 30.27 0 24 0 14.82 0 6.71 5.82 2.69 14.09l7.98 6.19C12.13 13.41 17.56 9.5 24 9.5z"/><path fill="#34A853" d="M46.1 24.55c0-1.64-.15-3.22-.42-4.74H24v9.01h12.42c-.54 2.9-2.18 5.36-4.65 7.01l7.19 5.59C43.93 37.13 46.1 31.3 46.1 24.55z"/><path fill="#FBBC05" d="M10.67 28.28a14.5 14.5 0 010-8.56l-7.98-6.19A23.94 23.94 0 000 24c0 3.77.9 7.34 2.69 10.47l7.98-6.19z"/><path fill="#EA4335" d="M24 48c6.27 0 11.54-2.07 15.38-5.63l-7.19-5.59c-2.01 1.35-4.59 2.15-8.19 2.15-6.44 0-11.87-3.91-13.33-9.28l-7.98 6.19C6.71 42.18 14.82 48 24 48z"/><path fill="none" d="M0 0h48v48H0z"/></g></svg>
            Sign in with Google
          </button>
          {/* Magic Link */}
          <form onSubmit={handleMagicLink} className="w-full mb-2">
            <button
              type="submit"
              disabled={isLoading || !email}
              className="w-full py-3 px-4 rounded-lg bg-white border border-gray-200 text-gray-900 font-medium text-base shadow-sm hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? 'Sending magic link...' : 'Sign in with magic link'}
            </button>
          </form>
          {/* Error/Message */}
          {error && <div className="mt-2 text-sm text-red-600 text-center">{error}</div>}
          {message && <div className="mt-2 text-sm text-emerald-600 text-center">{message}</div>}
          {/* Create Account */}
          <div className="mt-6 text-center">
            <span className="text-gray-500 text-sm">New to Caishen? </span>
            <Link
              href="/register"
              className="text-indigo-600 font-medium hover:underline ml-1"
            >
              Create account
            </Link>
          </div>
        </div>
      </div>
      {/* Footer */}
      <div className="w-full border-t border-gray-200 bg-white/80">
        <footer className="w-full max-w-5xl mx-auto px-6 py-6 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-gray-400">
          <div>© 2024 Caishen</div>
          <div className="flex gap-4">
            <a href="#" className="hover:text-indigo-600 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-indigo-600 transition-colors">Terms of Service</a>
          </div>
        </footer>
      </div>
    </div>
  );
} 