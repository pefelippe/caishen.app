'use client';

import { motion } from 'framer-motion';
import Header from '@/components/Header';
import ActionButtons from '@/components/ActionButtons';
import InteractiveDemo from '@/components/InteractiveDemo';
import FeaturesSection from '@/components/FeaturesSection';
import Footer from '@/components/Footer';

export default function LandingPage() {
  return (
    <motion.div 
      className="min-h-screen font-sans flex flex-col" 
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

      <main className="flex justify-center px-8 pt-[10%] w-full flex-1">
        <section className="flex w-full flex-col items-center max-w-screen-2xl">

            <motion.h1
              className="text-6xl font-bold tracking-tight delay-500 sm:text-[120px] text-stone-800 text-center"
            >
              Discover your new <br /> <mark className="bg-transparent font-extrabold shadow-[inset_0_-0.5em_0_0_rgb(240,171,252)] text-stone-800">AI financial homie</mark><br />
            </motion.h1>
            <ActionButtons />
            <InteractiveDemo />
            <FeaturesSection />
        </section>
      </main>

      <div className="mt-30">
        <Footer />
      </div>
    </motion.div>
  );
}