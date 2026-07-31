'use client';

import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { Button, Input, Coin } from '@caishen/ui';
import { useMagicLink } from '@caishen/services';

const DISPLAY = '[font-family:var(--font-display)]';
const MONO = '[font-family:var(--font-mono)]';

export default function LoginForm() {
  const reduce = useReducedMotion();
  const [email, setEmail] = useState('');
  const { sendLink, loading, error, success, reset } = useMagicLink();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendLink(email);
  };

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className="w-full max-w-md rounded-3xl border border-stone-900/10 bg-white/60 p-8 shadow-xl backdrop-blur-sm sm:p-10"
    >
      {success ? (
        <div className="text-center">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0E7C66] text-[#FFFBF7]">
            <Coin size={30} />
          </div>
          <h1 className={`${DISPLAY} text-2xl font-bold tracking-tight text-[#1C1917]`}>
            Check your email
          </h1>
          <p className="mt-2 text-[15px] leading-relaxed text-stone-600">
            We sent a magic link to{' '}
            <span className={`${MONO} text-[#1C1917]`}>{email}</span>. Click it to
            sign in.
          </p>
          <Button
            onClick={() => {
              reset();
              setEmail('');
            }}
            className="mt-7 h-11 w-full rounded-full bg-[#0B3D91] text-sm font-semibold text-white transition-transform hover:scale-[1.02]"
          >
            Use a different email
          </Button>
        </div>
      ) : (
        <>
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0B3D91] text-[#C79A3A]">
              <Coin size={30} />
            </div>
            <h1 className={`${DISPLAY} text-2xl font-bold tracking-tight text-[#1C1917]`}>
              Sign in to Caishen
            </h1>
            <p className="mt-2 text-[15px] text-stone-600">
              Enter your email — we&apos;ll send you a magic link.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              required
              autoFocus
              className="h-12 rounded-xl border-stone-300 bg-[#FFFBF7] px-4 text-[15px] text-[#1C1917] focus:border-[#0B3D91] focus:ring-[#0B3D91]"
            />

            {error && (
              <div className="flex items-center gap-2 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-full bg-[#0B3D91] text-sm font-semibold text-white transition-transform hover:scale-[1.02] disabled:opacity-70"
            >
              {loading ? 'Sending link…' : 'Send magic link'}
            </Button>
          </form>

          <p className={`${MONO} mt-6 text-center text-xs text-stone-500`}>
            No password · No card · Cancel anytime
          </p>
        </>
      )}
    </motion.div>
  );
}
