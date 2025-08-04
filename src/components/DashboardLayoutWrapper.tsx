'use client';

import { ReactNode } from 'react';
import LogoutButton from "@/components/LogoutButton";

interface DashboardLayoutWrapperProps {
  children: ReactNode;
}

export default function DashboardLayoutWrapper({ children }: DashboardLayoutWrapperProps) {
  return (
    <div className="flex flex-col min-h-screen font-sans" style={{ backgroundColor: '#FFFBF7' }}>
      <header className="sticky top-0 z-30 flex w-full justify-between p-4 sm:p-6 lg:p-8 px-4 sm:px-8 lg:px-16 backdrop-blur-xl duration-300 bg-transparent max-w-screen-2xl mx-auto">
        <div className="flex items-center">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-700 leading-tighter">caishen</div>
        </div>
        <div className="flex items-center">
          <LogoutButton />
        </div>
      </header>
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
} 