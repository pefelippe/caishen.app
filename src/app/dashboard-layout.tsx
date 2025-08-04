"use client"

import { ExpenseModal } from "@/app/dashboard-components/ExpenseModal"
import { AppHeader } from "@/app/dashboard-components/app-header"
import { motion, AnimatePresence } from "framer-motion"
import { useEffect, useState } from "react"
import { container, item } from "@/lib/animations"
import { ClientOnly } from "@/components/ClientOnly"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col min-h-screen font-sans" style={{ backgroundColor: '#FFFBF7' }}>
      <ClientOnly
        fallback={
          <>
            <AppHeader />
            <main className="flex-1">
              <div className="">
                {children}
              </div>
            </main>
            <ExpenseModal />
          </>
        }
      >
        <AnimatePresence>
          <motion.div 
            className="flex flex-col min-h-screen font-sans"
            style={{ backgroundColor: '#FFFBF7' }}
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
      </ClientOnly>
    </div>
  )
} 