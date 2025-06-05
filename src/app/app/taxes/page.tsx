"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, Filter, Download, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, ArrowUpRight } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"
import { format } from "date-fns"

const mockTaxes = [
  {
    id: 1,
    type: "Income Tax",
    amount: 2500.00,
    dueDate: new Date("2024-04-15"),
    status: "upcoming",
    year: 2024,
    quarter: "Q1",
  },
  {
    id: 2,
    type: "Property Tax",
    amount: 1200.00,
    dueDate: new Date("2024-03-31"),
    status: "paid",
    year: 2024,
    quarter: "Q1",
  },
  {
    id: 3,
    type: "Sales Tax",
    amount: 850.50,
    dueDate: new Date("2024-03-15"),
    status: "overdue",
    year: 2024,
    quarter: "Q1",
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

export default function TaxesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredTaxes = mockTaxes.filter((tax) =>
    tax.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default" className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Paid</Badge>
      case "upcoming":
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">Upcoming</Badge>
      case "overdue":
        return <Badge variant="destructive" className="bg-red-100 text-red-700 hover:bg-red-100">Overdue</Badge>
      default:
        return null
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "paid":
        return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      case "upcoming":
        return <TrendingUp className="h-4 w-4 text-blue-500" />
      case "overdue":
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
              Taxes
            </motion.h1>
            <motion.p 
              className="text-gray-500"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              Manage and track your tax obligations
            </motion.p>
          </div>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
          >
            <Button variant="outline" className="border-gray-200 hover:bg-gray-50 transition-all duration-200">
              <Download className="mr-2 h-4 w-4" />
              Export Tax Report
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
                <CardTitle className="text-sm font-medium text-gray-600">Total Tax Due</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$4,550.50</div>
                <p className="text-xs text-gray-500">For Q1 2024</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Paid Taxes</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$1,200.00</div>
                <p className="text-xs text-gray-500">26.4% of total</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Upcoming Due</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$2,500.00</div>
                <p className="text-xs text-gray-500">Due Apr 15, 2024</p>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div 
            whileHover={cardHover}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Overdue</CardTitle>
                <AlertCircle className="h-4 w-4 text-red-500" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-gray-900 mb-1">$850.50</div>
                <p className="text-xs text-gray-500">Due Mar 15, 2024</p>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>

        <motion.div variants={item}>
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <CardTitle className="text-xl font-semibold text-gray-900">Tax Records</CardTitle>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  <div className="relative w-full sm:w-[300px]">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      placeholder="Search tax records..."
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
                      <TableHead className="text-gray-600 font-medium">Due Date</TableHead>
                      <TableHead className="text-gray-600 font-medium">Year</TableHead>
                      <TableHead className="text-gray-600 font-medium">Quarter</TableHead>
                      <TableHead className="text-gray-600 font-medium">Status</TableHead>
                      <TableHead className="text-gray-600 font-medium w-[50px]"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence>
                      {filteredTaxes.map((tax) => (
                        <motion.tr
                          key={tax.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -20 }}
                          transition={{ duration: 0.2 }}
                          className="hover:bg-gray-50"
                        >
                          <TableCell className="font-medium text-gray-900">{tax.type}</TableCell>
                          <TableCell className="text-gray-900">${tax.amount.toFixed(2)}</TableCell>
                          <TableCell className="text-gray-600">{format(tax.dueDate, "MMM dd, yyyy")}</TableCell>
                          <TableCell className="text-gray-600">{tax.year}</TableCell>
                          <TableCell className="text-gray-600">{tax.quarter}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {getStatusIcon(tax.status)}
                              {getStatusBadge(tax.status)}
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