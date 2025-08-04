'use client';

import Header from '@/components/Header';
import Link from 'next/link';
import { motion } from 'framer-motion';

export default function LandingPage() {
  return (
    <div className="min-h-screen font-sans flex flex-col mt-32">
      <div>
        <Header />
      </div>

      <main className="flex justify-center px-6 pt-24 w-full flex-1">
        <section className="flex w-full flex-col items-center max-w-screen-2xl">
          {/* Hero Section */}
          <motion.div 
            className="text-center flex flex-col items-center gap-12"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.8,
              ease: "easeOut"
            }}
          >
            <motion.h1 
              className="text-6xl font-bold tracking-tight delay-500 sm:text-[120px] text-stone-800 text-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 1,
                delay: 0.2,
                ease: "easeOut"
              }}
            >
              Your Personal <br />
              <motion.mark 
                className="bg-transparent font-extrabold shadow-[inset_0_-0.5em_0_0_rgb(240,171,252)] text-stone-800"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ 
                  duration: 0.8,
                  delay: 0.6,
                  ease: "easeOut"
                }}
                whileHover={{ 
                  scale: 1.02,
                  transition: { duration: 0.2 }
                }}
              >
                Financial Assistant
              </motion.mark>
            </motion.h1>
            
            <motion.p 
              className="max-w-4xl mx-auto text-stone-600 leading-relaxed text-2xl"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ 
                duration: 0.8,
                delay: 0.4,
                ease: "easeOut"
              }}
            >
              Take control of your finances with AI-powered insights, smart expense tracking, and seamless WhatsApp integration.
            </motion.p>
          </motion.div>
        </section>
      </main>

      <motion.footer 
        className="bg-stone-900 text-white py-8 mt-16"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ 
          duration: 0.8,
          delay: 0.8,
          ease: "easeOut"
        }}
      >
        <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="mb-4 md:mb-0">
              <h3 className="text-lg font-bold">caishen.app</h3>
              <p className="text-stone-400 text-sm mt-1">
                Your Personal Financial Assistant
              </p>
            </div>
            
            <div className="flex space-x-6 text-sm">
              <Link href="/login" className="text-stone-400 hover:text-white transition-colors">
                Login
              </Link>
              <Link href="#" className="text-stone-400 hover:text-white transition-colors">
                Privacy
              </Link>
              <Link href="#" className="text-stone-400 hover:text-white transition-colors">
                Terms
              </Link>
            </div>
          </div>
          
          <div className="border-t border-stone-800 mt-6 pt-6 text-center">
            <p className="text-stone-500 text-sm">&copy; 2024 caishen.app</p>
          </div>
        </div>
      </motion.footer>
    </div>
  );
} 