'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  CreditCard,
  LayoutDashboard,
  Receipt,
  FileText,
  BarChart3,
  Search,
  Filter,
  Download,
  Plus
} from "lucide-react";

// Mock data
const mockData = {
  dashboard: {
    totalIncome: 7050.50,
    totalExpenses: 2250.49,
    netBalance: 4800.01,
    upcomingBills: 1345.49
  },
  expenses: [
    { id: 1, description: "Grocery Shopping", amount: 150.50, category: "Food", date: "2024-03-15", status: "paid" },
    { id: 2, description: "Netflix Subscription", amount: 29.99, category: "Entertainment", date: "2024-03-14", status: "pending" },
    { id: 3, description: "Gas Station", amount: 45.00, category: "Transportation", date: "2024-03-13", status: "paid" },
    { id: 4, description: "Restaurant", amount: 85.00, category: "Food", date: "2024-03-12", status: "paid" },
    { id: 5, description: "Amazon Purchase", amount: 120.00, category: "Shopping", date: "2024-03-11", status: "pending" }
  ],
  bills: [
    { id: 1, name: "Rent", amount: 1200.00, dueDate: "2024-03-25", status: "pending" },
    { id: 2, name: "Electricity", amount: 85.49, dueDate: "2024-03-20", status: "paid" },
    { id: 3, name: "Internet", amount: 60.00, dueDate: "2024-03-22", status: "pending" }
  ]
};

const navItems = [
  { id: 'dashboard', title: 'Dashboard', icon: LayoutDashboard, active: true },
  { id: 'expenses', title: 'Expenses', icon: Receipt, active: false },
  { id: 'bills', title: 'Bills', icon: FileText, active: false },
  { id: 'analytics', title: 'Analytics', icon: BarChart3, active: false }
];

export default function InteractiveDemo() {
  const [activeTab, setActiveTab] = useState('dashboard');

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge className="bg-emerald-100 text-emerald-700">Paid</Badge>;
      case "pending":
        return <Badge className="bg-blue-100 text-blue-700">Pending</Badge>;
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
              <div className="text-2xl font-bold text-gray-900">${mockData.dashboard.totalIncome.toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-gray-900">${mockData.dashboard.totalExpenses.toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-gray-900">${mockData.dashboard.netBalance.toLocaleString()}</div>
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
              <div className="text-2xl font-bold text-gray-900">${mockData.dashboard.upcomingBills.toLocaleString()}</div>
              <p className="text-xs text-gray-500">To be paid</p>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Food</span>
                </div>
                <span className="text-sm font-medium">$235.50</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Entertainment</span>
                </div>
                <span className="text-sm font-medium">$29.99</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Transportation</span>
                </div>
                <span className="text-sm font-medium">$45.00</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Shopping</span>
                </div>
                <span className="text-sm font-medium">$120.00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockData.expenses.slice(0, 4).map((expense) => (
                <div key={expense.id} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{expense.description}</p>
                      <p className="text-xs text-gray-500">{expense.date}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium">${expense.amount}</span>
                    {getStatusBadge(expense.status)}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Income</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-3 bg-gray-200 rounded-full">
                    <div className="w-20 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">67%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expenses</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-3 bg-gray-200 rounded-full">
                    <div className="w-10 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">32%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Spending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-sm font-medium text-green-600">+12%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Month</span>
                <span className="text-sm font-medium text-red-600">-5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average</span>
                <span className="text-sm font-medium text-gray-900">$1,850</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderExpenses = () => (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Expense Records</h2>
          <p className="text-gray-500">Track and manage your expenses</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" size="sm">
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
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
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                {mockData.expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{expense.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.category}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${expense.amount}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{expense.date}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(expense.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">$430.49</div>
            <p className="text-xs text-gray-500">This month</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Pending Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">$149.99</div>
            <p className="text-xs text-gray-500">To be paid</p>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium text-gray-600">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-900">4</div>
            <p className="text-xs text-gray-500">Active categories</p>
          </CardContent>
        </Card>
      </div>
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
        <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      {/* Bills Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {mockData.bills.map((bill) => (
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
                    <span className="text-lg font-bold text-gray-900">${bill.amount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Due Date:</span>
                    <span className="text-sm font-medium text-gray-900">{bill.dueDate}</span>
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

      {/* Additional Bills Info */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Payment Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Total Due:</span>
                <span className="text-lg font-bold text-gray-900">$1,345.49</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Paid This Month:</span>
                <span className="text-sm font-medium text-green-600">$85.49</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Pending:</span>
                <span className="text-sm font-medium text-orange-600">$1,260.00</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Upcoming Due Dates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Internet</p>
                    <p className="text-xs text-gray-500">Due in 2 days</p>
                  </div>
                </div>
                <span className="text-sm font-medium">$60.00</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Rent</p>
                    <p className="text-xs text-gray-500">Due in 7 days</p>
                  </div>
                </div>
                <span className="text-sm font-medium">$1,200.00</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Analytics</h2>
        <p className="text-gray-500">Detailed insights into your financial patterns</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Monthly Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Income</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-3 bg-gray-200 rounded-full">
                    <div className="w-20 h-3 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">67%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Expenses</span>
                <div className="flex items-center space-x-2">
                  <div className="w-32 h-3 bg-gray-200 rounded-full">
                    <div className="w-10 h-3 bg-red-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">32%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Spending Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="text-sm font-medium text-green-600">+12%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Last Month</span>
                <span className="text-sm font-medium text-red-600">-5%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Average</span>
                <span className="text-sm font-medium text-gray-900">$1,850</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Category Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Food & Dining</span>
                </div>
                <span className="text-sm font-medium">35%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Entertainment</span>
                </div>
                <span className="text-sm font-medium">15%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Transportation</span>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                  <span className="text-sm text-gray-600">Shopping</span>
                </div>
                <span className="text-sm font-medium">25%</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Savings Goals</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Emergency Fund</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-16 h-2 bg-green-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">67%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Vacation Fund</span>
                <div className="flex items-center space-x-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full">
                    <div className="w-8 h-2 bg-blue-500 rounded-full"></div>
                  </div>
                  <span className="text-sm font-medium">32%</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95, y: 20 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.8, delay: 0.6, ease: "easeOut" }}
      className="w-full max-w-screen-2xl min-h-[1000px] mx-auto"
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
          <div className="p-8 bg-gray-50 min-h-[800px]">
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
                {activeTab === 'analytics' && renderAnalytics()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  );
} 