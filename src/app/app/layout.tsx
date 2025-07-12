"use client"

import { ExpenseModal } from "@/components/modals/ExpenseModal"
import { AppHeader } from "@/components/app-header"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { container, item } from "@/lib/animations"

export default function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  if (!isMounted) {
    return (
      <div className="flex flex-col min-h-screen font-sans" style={{ backgroundColor: 'rgb(255, 247, 237)' }}>
        <AppHeader />
        <main className="flex-1">
          <div className="">
            {children}
          </div>
        </main>
        <ExpenseModal />
      </div>
    )
  }

  return (
    <AnimatePresence>
      <motion.div 
        className="flex flex-col min-h-screen font-sans"
        style={{ backgroundColor: 'rgb(255, 247, 237)' }}
        initial="hidden"
        animate="show"
        variants={container}
      >
        <motion.div variants={item}>
          <AppHeader />
        </motion.div>
        <motion.main 
          className="flex-1"
          variants={item}
        >
          <div className="">
            {children}
          </div>
        </motion.main>
        <motion.div variants={item}>
          <ExpenseModal />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
} 