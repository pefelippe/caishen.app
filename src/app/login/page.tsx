'use client';

import { motion } from 'framer-motion';
import LoginForm from './LoginForm';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center px-4">
      <div className="absolute top-0 left-0 right-0 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div 
          onClick={() => router.push('/')}
          className="flex items-center gap-3 h-20 cursor-pointer"
        >
          <span className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-green-600 to-teal-600 bg-clip-text text-transparent">
            Caishen
          </span>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <LoginForm />
      </motion.div>
    </div>
  );
} 