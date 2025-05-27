'use client';

import React from 'react';
import Link from 'next/link';
import { CircleDollarSign } from 'lucide-react';
import { UserMenu } from './UserMenu';

export function Header() {
  return (
    <header className="h-14 w-full border-b border-slate-200 bg-white">
      <div className="mx-auto flex h-full max-w-[2000px] items-center justify-between px-6">
        <div className="flex items-center gap-2">
          <Link href="/app/dashboard" className="flex items-center gap-2">
            <CircleDollarSign className="h-5 w-5 text-indigo-600" />
            <span className="text-base font-medium text-gray-900">Caishen</span>
          </Link>
        </div>

        <UserMenu />
      </div>
    </header>
  );
} 