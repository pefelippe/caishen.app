'use client';

import Link from 'next/link';

export default function Header() {
  return (
    <header className="transition-shadows fixed top-0 z-40 flex w-full justify-between p-8 px-16 outline outline-1 outline-orange-400/0 backdrop-blur-xl duration-300">
      <div className="flex items-center delay-75">
        <Link href="/" className="group flex items-center outline-none" tabIndex={-1} aria-label="Go home">
          <div className="text-2xl font-bold text-stone-800 leading-tighter">caishen.app</div>
        </Link>
      </div>
      <div className="flex items-center space-x-7 delay-75">
        <a 
          href="/login" 
          className="group relative inline-flex max-h-[3.75rem] items-center justify-center rounded-2xl px-5 py-4 text-lg font-bold outline-none transition duration-300 focus:ring-2 focus:ring-rose-300/90 bg-stone-800 text-orange-75 shadow-xl shadow-orange-950/20 after:absolute after:inset-0 after:hidden after:rounded-2xl after:shadow-2xl after:shadow-orange-950/25 after:content-[''] sm:shadow-orange-950/25 sm:after:block pl-[3.25rem]"
        >
          <div className="ease absolute left-5 translate-x-0 opacity-100 transition duration-300 group-hover:-translate-x-full group-hover:scale-x-50 group-hover:opacity-0 group-hover:blur-sm">
            <svg className="h-6 w-6 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M12 5l7 7-7 7"/>
            </svg>
          </div>
          <div className="ease translate-x-0 transition duration-300 group-hover:-translate-x-8">Get Started</div>
          <div className="ease absolute right-5 translate-x-full scale-x-50 opacity-0 blur-sm transition duration-300 group-hover:translate-x-0 group-hover:scale-x-100 group-hover:opacity-100 group-hover:blur-none">
            <svg className="h-6 w-6 fill-transparent stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"></path>
            </svg>
          </div>
        </a>
      </div>
    </header>
  );
} 