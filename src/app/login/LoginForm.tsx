'use client';

import { useState } from 'react';
import { FcGoogle } from 'react-icons/fc';
import { FaApple } from 'react-icons/fa';
import { signInWithGoogleService, signInWithAppleService, sendMagicLinkService } from '@/services/authService';
import { TermsOfServiceModal } from '@/components/modals/TermsOfServiceModal';
import { PrivacyPolicyModal } from '@/components/modals/PrivacyPolicyModal';

export default function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    const result = await sendMagicLinkService(email);
    setIsLoading(false);
    if (result.success) {
      setMagicLinkSent(true);
    } else {
      setError(result.error || 'An error occurred');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError('');
    const result = await signInWithGoogleService();
    setIsLoading(false);
    if (result.success) {
      window.location.href = '/app/dashboard';
    } else {
      setError(result.error || 'An error occurred');
    }
  };

  const handleAppleSignIn = async () => {
    setIsLoading(true);
    setError('');
    const result = await signInWithAppleService();
    setIsLoading(false);
    if (result.success) {
      window.location.href = '/app/dashboard';
    } else {
      setError(result.error || 'An error occurred');
    }
  };

  return (
    <>
      <div className="bg-white p-8 rounded-2xl shadow-lg border border-gray-200">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Welcome back</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to continue managing your finances
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {magicLinkSent ? (
          <div className="mb-4 p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg border border-emerald-100">
            Check your email for the magic link to sign in.
          </div>
        ) : (
          <form onSubmit={handleMagicLink} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Email address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                required
                className="w-full px-4 py-3 border border-gray-200 rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all duration-200"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-transparent rounded-lg text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 cursor-pointer"
            >
              {isLoading ? 'Sending...' : 'Send Magic Link'}
            </button>
          </form>
        )}

        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">OR</span>
          </div>
        </div>

        <div className="space-y-4">
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 cursor-pointer"
          >
            <FcGoogle className="w-5 h-5" />
            <span className="font-medium">Continue with Google</span>
          </button>

          <button
            onClick={handleAppleSignIn}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2 cursor-pointer"
          >
            <FaApple className="w-5 h-5" />
            <span className="font-medium">Continue with Apple</span>
          </button>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-center text-sm text-gray-500">
            By continuing, you agree to our{' '}
            <button
              onClick={() => setIsTermsOpen(true)}
              className="text-emerald-600 hover:text-emerald-700 font-medium focus:outline-none focus:underline cursor-pointer"
            >
              Terms of Service
            </button>{' '}
            and{' '}
            <button
              onClick={() => setIsPrivacyOpen(true)}
              className="text-emerald-600 hover:text-emerald-700 font-medium focus:outline-none focus:underline cursor-pointer"
            >
              Privacy Policy
            </button>
          </p>
        </div>
      </div>

      <TermsOfServiceModal
        isOpen={isTermsOpen}
        onClose={() => setIsTermsOpen(false)}
      />

      <PrivacyPolicyModal
        isOpen={isPrivacyOpen}
        onClose={() => setIsPrivacyOpen(false)}
      />
    </>
  );
} 