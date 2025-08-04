'use client';

import Link from 'next/link';

interface HeaderProps {
  showButtons?: boolean;
}

export default function Header({ showButtons = true }: HeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-transparent">
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-stone-800 hover:text-stone-900 transition-colors">
              caishen.app
            </Link>
          </div>
          {showButtons && (
            <div className="flex items-center">
              <Link 
                href="/login" 
                className="bg-stone-800 hover:bg-stone-900 text-white px-6 py-3 rounded-md text-base font-medium transition-colors"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
} 