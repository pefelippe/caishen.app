import { motion } from 'framer-motion';
import { ArrowRight, Wallet, MessageSquare, Brain, Coins } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function HeroSection() {
  const router = useRouter();
  return (
    <div className="text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.5 }}
        className="my-12 mb-8 flex items-center justify-center gap-8 text-sm text-gray-500"
      >
        <div className="flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" />
          <span>Smart Expense Control</span>
        </div>
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-emerald-600" />
          <span>AI-Powered Insights</span>
        </div>
        <div className="flex items-center gap-2">
          <MessageSquare className="w-5 h-5 text-emerald-600" />
          <span>WhatsApp Integration</span>
        </div>
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.2 }}
        className="text-4xl sm:text-7xl font-extrabold text-gray-900 leading-tight"
      >
        <span className="block leading-tighter">Take Control of Your Finances</span>
      </motion.h1>
      <motion.p
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.3 }}
        className="max-w-2xl mx-auto text-base text-gray-500 sm:text-lg md:mt-8 md:max-w-2xl leading-relaxed mb-6"
      >
        Effortlessly track your spending, receive smart insights, and stay on top of your financial goals. Join thousands who trust Caishen to manage their money with confidence.
      </motion.p>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4 }}
        className="max-w-md mx-auto sm:flex sm:justify-center"
      >
        <div className="rounded-full shadow-lg">
          <button
            onClick={() => router.push('/login')}
            className="w-full flex items-center justify-center px-10 py-4 border border-transparent text-lg font-medium rounded-full text-white bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-700 hover:to-green-700 md:py-5 md:text-xl md:px-12 transition-all duration-200 shadow-sm hover:shadow cursor-pointer"
          >
            Get Started
            <ArrowRight className="ml-2 w-6 h-6" />
          </button>
        </div>
      </motion.div>
    </div>
  );
} 