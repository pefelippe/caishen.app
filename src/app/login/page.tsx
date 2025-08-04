'use client';

import { motion } from 'framer-motion';
import LoginForm from './LoginForm';
import Header from '@/components/Header';

export default function LoginPage() {
  return (
    <div className="min-h-screen font-sans flex flex-col" style={{ backgroundColor: '#FFFBF7' }}>
      <Header showButtons={false} />

      <main className="flex justify-center items-center px-8 w-full flex-1">
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