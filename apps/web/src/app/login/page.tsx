'use client';

import Link from 'next/link';
import { Coin } from '@caishen/ui';
import LoginForm from './LoginForm';

const DISPLAY = '[font-family:var(--font-display)]';

export default function LoginPage() {
  return (
    <div className="flex min-h-screen flex-col bg-[#FFFBF7]">
      <header className="mx-auto flex w-full max-w-6xl items-center px-5 py-5">
        <Link href="/" className="flex items-center gap-2.5">
          <Coin size={24} className="text-[#C79A3A]" />
          <span className={`${DISPLAY} text-lg font-bold tracking-tight text-[#1C1917]`}>Caishen</span>
        </Link>
      </header>

      <main className="flex w-full flex-1 items-center justify-center px-5 pb-24">
        <LoginForm />
      </main>
    </div>
  );
}
