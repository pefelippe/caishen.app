"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, PieChart, ChevronLeft, ChevronRight, Eye, Download, Plus } from "lucide-react"
import { motion } from "framer-motion"
import { useState } from "react"
import { useAuth } from "@/hooks/useAuth"

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

interface Expense {
  id: string;
  name: string;
  value: number;
  category: string;
  date: string;
  isRecurring: boolean;
  recurringUntil?: string;
}

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const [currentPage, setCurrentPage] = useState(1);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const expenses: Expense[] = [
    { id: '1', name: 'Rent', value: 1200, category: 'Housing', date: '2024-01-15', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '2', name: 'Electric Bill', value: 150, category: 'Utilities', date: '2024-01-20', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '3', name: 'Grocery Shopping', value: 450, category: 'Food', date: '2024-01-18', isRecurring: false },
    { id: '4', name: 'Uber', value: 25, category: 'Transportation', date: '2024-01-22', isRecurring: false },
    { id: '5', name: 'Netflix', value: 15.99, category: 'Entertainment', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '6', name: 'Gym Membership', value: 89.90, category: 'Health', date: '2024-01-05', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '7', name: 'Restaurant', value: 120, category: 'Food', date: '2024-01-25', isRecurring: false },
    { id: '8', name: 'Gas', value: 200, category: 'Transportation', date: '2024-01-10', isRecurring: false },
    { id: '9', name: 'Water Bill', value: 80, category: 'Utilities', date: '2024-01-12', isRecurring: true, recurringUntil: '2024-12-31' },
    { id: '10', name: 'Spotify', value: 9.99, category: 'Entertainment', date: '2024-01-01', isRecurring: true, recurringUntil: '2024-12-31' },
  ];

  const itemsPerPage = 10;
  const totalPages = Math.ceil(expenses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentExpenses = expenses.slice(startIndex, endIndex);
  
  const displayExpenses = Array.from({ length: 10 }, (_, index) => {
    if (index < currentExpenses.length) {
      return currentExpenses[index];
    } else {
      return {
        id: `empty-${index}`,
        name: '',
        value: 0,
        category: '',
        date: '',
        isRecurring: false
      };
    }
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div 
          initial="hidden"
          animate="show"
          variants={container}
        >
          {/* Header Section */}
          <motion.div variants={item} className="mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
                <p className="text-gray-600 mt-1">Welcome back, {user?.displayName || "User"}</p>
              </div>
              <div className="flex items-center space-x-3 mt-4 sm:mt-0">
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Expense
                </Button>
              </div>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <motion.div variants={item} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Income</p>
                    <p className="text-2xl font-bold text-gray-900">$8,500</p>
                    <p className="text-xs text-green-600 flex items-center mt-1">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      +12% from last month
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Expenses</p>
                    <p className="text-2xl font-bold text-gray-900">$3,200</p>
                    <p className="text-xs text-red-600 flex items-center mt-1">
                      <TrendingDown className="h-3 w-3 mr-1" />
                      -8% from last month
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-red-100 rounded-lg flex items-center justify-center">
                    <TrendingDown className="h-6 w-6 text-red-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Net Balance</p>
                    <p className="text-2xl font-bold text-gray-900">$5,300</p>
                    <p className="text-xs text-blue-600 flex items-center mt-1">
                      <DollarSign className="h-3 w-3 mr-1" />
                      +62% savings rate
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white border-gray-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Savings Rate</p>
                    <p className="text-2xl font-bold text-gray-900">62%</p>
                    <p className="text-xs text-purple-600 flex items-center mt-1">
                      <Target className="h-3 w-3 mr-1" />
                      Above average
                    </p>
                  </div>
                  <div className="h-12 w-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Target className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content Grid */}
          <motion.div variants={item} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* AI Insights */}
            <div className="lg:col-span-1">
              <Card className="bg-white border-gray-200 h-full">
                <CardHeader className="pb-4">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    AI Insights
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="bg-green-50 border-l-4 border-green-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-6 w-6 bg-green-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">✓</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-green-800">Positive Points</h4>
                        <p className="text-sm text-green-700 mt-1">Your savings rate is above average (62% vs 20% recommended)</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-amber-50 border-l-4 border-amber-400 p-4 rounded-r-lg">
                    <div className="flex items-start">
                      <div className="flex-shrink-0">
                        <div className="h-6 w-6 bg-amber-400 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">!</span>
                        </div>
                      </div>
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-amber-800">Opportunities</h4>
                        <p className="text-sm text-amber-700 mt-1">Consider investing part of your savings in fixed income</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Expenses Table */}
            <div className="lg:col-span-2">
              <Card className="bg-white border-gray-200">
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg font-semibold text-gray-900">Recent Expenses</CardTitle>
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-2" />
                      View All
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-gray-200">
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Description</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Category</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-left py-3 px-4 text-sm font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {displayExpenses.map((expense, index) => (
                          <tr key={expense.id} className={`${expense.name ? 'hover:bg-gray-50' : ''}`}>
                            <td className="py-3 px-4 text-sm text-gray-900">
                              {expense.name || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {expense.category || '—'}
                            </td>
                            <td className="py-3 px-4 text-sm font-medium text-gray-900">
                              {expense.value > 0 ? formatCurrency(expense.value) : '—'}
                            </td>
                            <td className="py-3 px-4 text-sm text-gray-600">
                              {expense.date ? new Date(expense.date).toLocaleDateString('en-US') : '—'}
                            </td>
                            <td className="py-3 px-4">
                              {expense.name ? (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  Paid
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination */}
                  {totalPages > 1 && (
                    <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                      <div className="text-sm text-gray-700">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                          disabled={currentPage === totalPages}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
} 