'use client';

import { motion } from 'framer-motion';
import LoginForm from '../../../login/LoginForm';
import Header from '@/app/landing-components/Header';

export default function LoginPage() {
  return (
    <div className="min-h-screen font-sans flex flex-col">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.2 }}
      >
        <Header showGetStarted={false} />
      </motion.div>

      <main className="flex justify-center px-8 pt-[10%] w-full flex-1">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md"
        >
          <LoginForm />
        </motion.div>
      </main>
    </div>
  );
} 