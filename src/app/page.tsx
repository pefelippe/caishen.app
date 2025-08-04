'use client';

import { motion } from 'framer-motion';
import Header from '@/app/landing-components/Header';
import ActionButtons from '@/app/landing-components/ActionButtons';
import InteractiveDemo from '@/app/landing-components/InteractiveDemo';
import Footer from '@/app/landing-components/Footer';
import { ClientOnly } from '@/components/ClientOnly';

export default function LandingPage() {
  return (
    <ClientOnly
      fallback={
        <div className="min-h-screen font-sans flex flex-col mt-32">
          <Header />
          <main className="flex justify-center px-6 pt-24 w-full flex-1">
            <section className="flex w-full flex-col items-center max-w-screen-3xl">
              <div className="text-center flex flex-col items-center gap-12">
                <h1 className="text-6xl font-bold tracking-tight delay-500 sm:text-[120px] text-stone-800 text-center">
                  Your Personal <br />
                  <mark className="bg-transparent font-extrabold shadow-[inset_0_-0.5em_0_0_rgb(240,171,252)] text-stone-800">
                    Financial Assistant
                  </mark>
                </h1>
                <p className="max-w-4xl mx-auto text-stone-600 leading-relaxed text-2xl">
                  Take control of your finances with AI-powered insights, smart expense tracking, and seamless WhatsApp integration.
                </p>
              </div>
              <ActionButtons />
              <InteractiveDemo />
            </section>
          </main>
          <Footer />
        </div>
      }
    >
      <motion.div 
        className="min-h-screen font-sans flex flex-col mt-32" 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1 }}
      >
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Header />
        </motion.div>

        <main className="flex justify-center px-6 pt-24 w-full flex-1">
          <section className="flex w-full flex-col items-center max-w-screen-3xl">
            {/* Hero Section */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="text-center flex flex-col items-center gap-12"
            >
              <motion.h1
                className="text-6xl font-bold tracking-tight delay-500 sm:text-[120px] text-stone-800 text-center"
              >
                Your Personal <br />
                <mark className="bg-transparent font-extrabold shadow-[inset_0_-0.5em_0_0_rgb(240,171,252)] text-stone-800">
                  Financial Assistant
                </mark>
              </motion.h1>
              
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="max-w-4xl mx-auto text-stone-600 leading-relaxed text-2xl"
              >
                Take control of your finances with AI-powered insights, smart expense tracking, and seamless WhatsApp integration.
              </motion.p>
            </motion.div>

            <ActionButtons />
            <InteractiveDemo />
          </section>
        </main>

        <Footer />
      </motion.div>
    </ClientOnly>
  );
} 