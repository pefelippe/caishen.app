"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, TrendingUp, TrendingDown, DollarSign, CreditCard } from "lucide-react"
import { motion } from "framer-motion"

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2
    }
  }
}

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { 
    opacity: 1, 
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 100,
      damping: 15
    }
  }
}

const cardHover = {
  scale: 1.02,
  transition: {
    type: "spring" as const,
    stiffness: 300,
    damping: 20
  }
}

export default function DashboardPage() {
  return (
    <motion.div 
      className="min-h-[95vh] bg-gray-50/50"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div variants={item} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <motion.h1 
              className="text-4xl font-bold tracking-tight text-gray-900 mb-2"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              Dashboard
            </motion.h1>
            <motion.p 
              className="text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Overview of your financial status
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50 transition-all duration-200">
              <Download className="mr-2 h-4 w-4" />
              Export Report
            </Button>
          </motion.div>
        </motion.div>

        <motion.div 
          variants={item} 
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
        >
          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$7,050.50</div>
                <p className="text-xs text-gray-500">This month</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$2,250.49</div>
                <p className="text-xs text-gray-500">This month</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Net Balance</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$4,800.01</div>
                <p className="text-xs text-gray-500">This month</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Upcoming Bills</CardTitle>
                <CreditCard className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$1,345.49</div>
                <p className="text-xs text-gray-500">To be paid</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Recent Transactions</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No recent transactions</p>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-xl font-semibold text-gray-900">Upcoming Bills</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">No upcoming bills</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
} 