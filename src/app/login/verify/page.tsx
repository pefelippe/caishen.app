'use client';

import { useVerifyMagicLink } from '@/hooks/useVerifyMagicLink';

export default function VerifyPage() {
  const { loading, error } = useVerifyMagicLink();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF7' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-stone-800 to-stone-900 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">🔐</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verifying your magic link...</h2>
          <p className="text-gray-600">Please wait while we sign you in.</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#FFFBF7' }}>
        <div className="text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-red-500 to-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <span className="text-white text-2xl">❌</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Verification failed</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <a
            href="/login"
            className="bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-xl transition-all duration-200 inline-block"
          >
            Try again
          </a>
        </div>
      </div>
    );
  }

  return null;
} 