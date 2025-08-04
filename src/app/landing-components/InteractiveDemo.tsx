'use client';

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  LayoutDashboard,
  Receipt,
  FileText,
  BarChart3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  CreditCard,
  Plus,
  Download,
  Search,
  Filter,
  Brain,
  MessageSquare,
  Target,
  PiggyBank
} from "lucide-react";

// Utility function for consistent number formatting
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
};

// Demo data for interactive preview - realistic Caishen app data
const demoData = {
  dashboard: {
    totalIncome: 8500,
    totalExpenses: 3200,
    netBalance: 5300,
    upcomingBills: 1200
  },
  expenses: [
    { id: 1, description: "Rent", amount: 1200, category: "Housing", date: "2024-01-15", status: "paid" },
    { id: 2, description: "Netflix", amount: 15.99, category: "Entertainment", date: "2024-01-14", status: "paid" },
    { id: 3, description: "Grocery Shopping", amount: 150, category: "Food", date: "2024-01-13", status: "paid" },
    { id: 4, description: "Uber", amount: 25, category: "Transportation", date: "2024-01-12", status: "paid" },
    { id: 5, description: "Electric Bill", amount: 120, category: "Utilities", date: "2024-01-20", status: "pending" }
  ],
  bills: [
    { id: 1, name: "Rent", amount: 1200, dueDate: "2024-01-25", status: "pending" },
    { id: 2, name: "Internet", amount: 65, dueDate: "2024-01-18", status: "paid" },
    { id: 3, name: "Gym Membership", amount: 45, dueDate: "2024-01-22", status: "pending" }
  ],
  goals: [
    { id: 1, name: "Emergency Fund", target: 10000, current: 3500, deadline: "2024-12-31", category: "emergency" },
    { id: 2, name: "Europe Trip", target: 15000, current: 8000, deadline: "2025-06-30", category: "travel" }
  ]
};

const navItems = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'expenses', title: 'Expenses', icon: Receipt, active: false },
  { id: 'bills', title: 'Bills', icon: FileText, active: false },
  { id: 'goals', title: 'Goals', icon: Target, active: false }
];

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>;
      case "pending":
        return <Badge className="bg-amber-100 text-amber-700">Pending</Badge>;
      case "failed":
        return <Badge className="bg-red-100 text-red-700">Failed</Badge>;
      default:
        return null;
    }
  };

  const renderDashboard = () => (
    <div className="space-y-8">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-1"
        >
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Income</CardTitle>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(demoData.dashboard.totalIncome)}</div>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-1"
        >
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
              <TrendingDown className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(demoData.dashboard.totalExpenses)}</div>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-1"
        >
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Net Balance</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(demoData.dashboard.netBalance)}</div>
              <p className="text-xs text-gray-500">This month</p>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="col-span-1"
        >
          <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Upcoming Bills</CardTitle>
              <CreditCard className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{formatCurrency(demoData.dashboard.upcomingBills)}</div>
              <p className="text-xs text-gray-500">To be paid</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* AI Insights Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <Brain className="h-5 w-5 mr-2 text-emerald-600" />
              AI Insights
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-emerald-50 p-4 rounded-lg border-l-4 border-emerald-500">
                <h4 className="font-semibold text-emerald-800 mb-2">✅ Positive Points</h4>
                <p className="text-emerald-700 text-sm">Your savings are above average (62% vs 20% recommended)</p>
              </div>
              <div className="bg-amber-50 p-4 rounded-lg border-l-4 border-amber-500">
                <h4 className="font-semibold text-amber-800 mb-2">⚠️ Opportunities</h4>
                <p className="text-amber-700 text-sm">Consider investing part of your savings in fixed income</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
              <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
              WhatsApp Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 text-sm">💬 New expense recorded: Grocery Shopping - $150.00</p>
                <p className="text-blue-600 text-xs">2 hours ago</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-green-800 text-sm">🎯 Goal updated: Emergency Fund - 35% completed</p>
                <p className="text-green-600 text-xs">Yesterday</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {demoData.expenses.slice(0, 4).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                    <p className="text-xs text-gray-500">{new Date(expense.date).toLocaleDateString('en-US')}</p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium">{formatCurrency(expense.amount)}</span>
                  {getStatusBadge(expense.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expenses</h2>
          <p className="text-gray-500">Manage your expenses</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
            <Plus className="mr-2 h-4 w-4" />
            Add Expense
          </Button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search expenses..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <Button variant="outline" size="sm">
          <Filter className="mr-2 h-4 w-4" />
          Filter
        </Button>
      </div>

      {/* Expenses Table */}
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {demoData.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatCurrency(expense.amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(expense.date).toLocaleDateString('en-US')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(expense.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderBills = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Upcoming Bills</h2>
          <p className="text-gray-500">Manage your recurring payments</p>
        </div>
        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {demoData.bills.map((bill) => (
          <motion.div
            key={bill.id}
            whileHover={{ scale: 1.02 }}
            className="col-span-1"
          >
            <Card className="border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-gray-900">{bill.name}</CardTitle>
                  {getStatusBadge(bill.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Amount:</span>
                    <span className="text-lg font-bold text-gray-900">{formatCurrency(bill.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Due Date:</span>
                    <span className="text-sm font-medium text-gray-900">{new Date(bill.dueDate).toLocaleDateString('en-US')}</span>
                  </div>
                  <Button className="w-full mt-3" variant="outline" size="sm">
                    Pay Now
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderGoals = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Goals</h2>
        <p className="text-gray-500">Track your financial goals progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {demoData.goals.map((goal) => (
          <Card key={goal.id} className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900 flex items-center">
                <PiggyBank className="h-5 w-5 mr-2 text-emerald-600" />
                {goal.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-600">Progress</span>
                  <span className="text-sm font-medium">{Math.round((goal.current / goal.target) * 100)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-600 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${(goal.current / goal.target) * 100}%` }}
                  ></div>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Current: {formatCurrency(goal.current)}</span>
                  <span className="text-gray-500">Target: {formatCurrency(goal.target)}</span>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-500">Remaining: {formatCurrency(goal.target - goal.current)}</p>
                  <p className="text-xs text-gray-500">Deadline: {new Date(goal.deadline).toLocaleDateString('en-US')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
      className="w-full max-w-screen-3xl min-h-[800px] mx-auto"
    >
      <div className="text-center py-12">
        {/* Demo Container */}
        <div className="bg-white rounded-3xl shadow-2xl border border-gray-200 overflow-hidden">

          {/* Navigation */}
          <div className="bg-gray-100 px-6 py-3 border-b border-gray-200">
            <div className="flex space-x-1">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex items-center space-x-2 ${
                    activeTab === item.id
                      ? 'bg-white text-gray-900 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  <span>{item.title}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <div className="p-8 bg-gray-50 min-h-[700px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && renderDashboard()}
                {activeTab === 'expenses' && renderExpenses()}
                {activeTab === 'bills' && renderBills()}
                {activeTab === 'goals' && renderGoals()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 