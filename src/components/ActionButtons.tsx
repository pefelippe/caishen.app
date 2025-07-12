import { motion } from 'framer-motion';

export default function ActionButtons() {
  return (
    <motion.div 
      className="flex flex-col items-center justify-center space-y-6 delay-700 my-16 sm:flex-row sm:space-x-7 sm:space-y-0"

    >
      <a className="group relative inline-flex max-h-[4.5rem] items-center justify-center rounded-2xl px-8 py-6 text-xl font-bold outline-none transition duration-300 focus:ring-2 focus:ring-rose-300/90 bg-stone-800 text-orange-75 shadow-xl shadow-orange-950/20 after:absolute after:inset-0 after:hidden after:rounded-2xl after:shadow-2xl after:shadow-orange-950/25 after:content-[''] sm:shadow-orange-950/25 sm:after:block pl-[4rem]" href="/login" aria-label="Get Started">
        <div className="ease absolute left-6 translate-x-0 opacity-100 transition duration-300 group-hover:-translate-x-full group-hover:scale-x-50 group-hover:opacity-0 group-hover:blur-sm">
          <svg className="h-8 w-8 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 5l7 7-7 7"/>
          </svg>
        </div>
        <div className="ease translate-x-0 transition duration-300 group-hover:-translate-x-8">Get Started</div>
        <div className="ease absolute right-6 translate-x-full scale-x-50 opacity-0 blur-sm transition duration-300 group-hover:translate-x-0 group-hover:scale-x-100 group-hover:opacity-100 group-hover:blur-none">
          <svg className="h-8 w-8 fill-transparent stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"></path>
          </svg>
        </div>
      </a>
      <a className="group relative inline-flex max-h-[4.5rem] items-center justify-center rounded-2xl px-8 py-6 text-xl font-bold outline-none transition duration-300 focus:ring-2 focus:ring-rose-300/90 bg-stone-800 text-orange-75 shadow-xl shadow-orange-950/20 after:absolute after:inset-0 after:hidden after:rounded-2xl after:shadow-2xl after:shadow-orange-950/25 after:content-[''] sm:shadow-orange-950/25 sm:after:block pl-[4rem] opacity-50 cursor-not-allowed" aria-label="Download for Mac">
        <div className="ease absolute left-6 translate-x-0 opacity-100 transition duration-300 group-hover:-translate-x-full group-hover:scale-x-50 group-hover:opacity-0 group-hover:blur-sm">
          <svg className="h-9 w-9 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M19.37 7.648c-.114.088-2.11 1.213-2.11 3.715 0 2.894 2.54 3.918 2.616 3.944-.011.062-.403 1.402-1.34 2.767-.834 1.201-1.706 2.4-3.032 2.4s-1.667-.77-3.198-.77c-1.492 0-2.022.796-3.235.796-1.214 0-2.06-1.112-3.033-2.477C4.911 16.42 4 13.93 4 11.566c0-3.791 2.465-5.802 4.891-5.802 1.29 0 2.364.847 3.173.847.77 0 1.972-.897 3.438-.897.556 0 2.553.05 3.867 1.934Zm-4.564-3.54c.607-.719 1.036-1.718 1.036-2.716 0-.138-.012-.279-.037-.392-.987.037-2.161.657-2.87 1.478-.555.632-1.074 1.63-1.074 2.643 0 .152.026.304.037.353.063.011.164.025.266.025.885 0 1.998-.593 2.642-1.39Z"></path>
          </svg>
        </div>
        <div className="ease translate-x-0 transition duration-300 group-hover:-translate-x-8 text-">Download <span>for Mac</span></div>
        <div className="ease absolute right-6 translate-x-full scale-x-50 opacity-0 blur-sm transition duration-300 group-hover:translate-x-0 group-hover:scale-x-100 group-hover:opacity-100 group-hover:blur-none">
          <svg className="h-9 w-9 fill-transparent stroke-current stroke-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M4.5 12h15m0 0l-6.75-6.75M19.5 12l-6.75 6.75"></path>
          </svg>
        </div>
      </a>
    </motion.div>
  );
} 