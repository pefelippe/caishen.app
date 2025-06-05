"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, Download, TrendingUp, AlertCircle, CheckCircle2, ArrowUpRight } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { format } from "date-fns"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"

// Mock data - replace with real data from your backend
const mockIncomes = [
  {
    id: 1,
    type: "Salary",
    amount: 5000.00,
    date: new Date("2024-03-15"),
    status: "received",
    source: "Company Inc",
    category: "Regular",
  },
  {
    id: 2,
    type: "Freelance",
    amount: 1200.00,
    date: new Date("2024-03-20"),
    status: "pending",
    source: "Client A",
    category: "Project",
  },
  {
    id: 3,
    type: "Investment",
    amount: 850.50,
    date: new Date("2024-03-25"),
    status: "received",
    source: "Stock Market",
    category: "Dividends",
  },
]

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
      type: "spring",
      stiffness: 100,
      damping: 15
    }
  }
}

const cardHover = {
  scale: 1.02,
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 20
  }
}

export default function IncomePage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredIncomes = mockIncomes.filter((income) =>
    income.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    income.source.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "received":
        return <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Received</Badge>
      case "pending":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Pending</Badge>
      case "failed":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">Failed</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "received":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "pending":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case "failed":
        return <AlertCircle className="h-4 w-4 text-red-500" />
      default:
        return null
    }
  }

  return (
    <motion.div 
      className="min-h-screen bg-gray-50/50"
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
              Income
            </motion.h1>
            <motion.p 
              className="text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Track and manage your income sources
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50 transition-all duration-200">
              <Download className="mr-2 h-4 w-4" />
              Export Income Report
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
                <CardTitle className="text-sm font-medium text-gray-600">Pending Income</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$1,200.00</div>
                <p className="text-xs text-gray-500">To be received</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Average Monthly</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$5,850.50</div>
                <p className="text-xs text-gray-500">Last 3 months</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Income Sources</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">3</div>
                <p className="text-xs text-gray-500">Active sources</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Income Records</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search income records..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-9 border-gray-200 focus:border-gray-300 focus:ring-gray-300 w-full"
                    />
                  </div>
                  <Button variant="outline" className="border-gray-200 hover:bg-gray-50 w-full sm:w-auto">
                    <Filter className="mr-2 h-4 w-4" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="rounded-md border border-gray-200 overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gray-50 hover:bg-gray-50">
                      <TableHead className="text-gray-600 font-medium">Type</TableHead>
                      <TableHead className="text-gray-600 font-medium">Amount</TableHead>
                      <TableHead className="text-gray-600 font-medium">Date</TableHead>
                      <TableHead className="text-gray-600 font-medium">Source</TableHead>
                      <TableHead className="text-gray-600 font-medium">Category</TableHead>
                      <TableHead className="text-gray-600 font-medium">Status</TableHead>
                      <TableHead className="text-gray-600 font-medium w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredIncomes.map((income) => (
                        <motion.tr
                          key={income.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium text-gray-900">{income.type}</TableCell>
                          <TableCell className="text-gray-900">${income.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-gray-600">{format(income.date, "MMM dd, yyyy")}</TableCell>
                          <TableCell className="text-gray-600">{income.source}</TableCell>
                          <TableCell className="text-gray-600">{income.category}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(income.status)}
                              {getStatusBadge(income.status)}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <ArrowUpRight className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
} 