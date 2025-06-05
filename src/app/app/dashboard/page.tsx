"use client"

import { Card } from "@/components/ui/card"
import { ArrowUpRight, ArrowDownRight, DollarSign, CreditCard, PiggyBank, TrendingUp } from "lucide-react"
import { motion } from "framer-motion"
import { container, item } from "@/lib/animations"

export default function DashboardPage() {
  return (
    <motion.div 
      className="space-y-8"
      initial="hidden"
      animate="show"
      variants={container}
    >
      <motion.div variants={item} className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Financial Overview</h1>
        <p className="text-lg text-gray-500">Track your expenses and manage your budget effectively.</p>
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="grid gap-6 md:grid-cols-2">
            <motion.div variants={item}>
              <Card className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Total Balance</p>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">$12,345</h2>
                  </div>
                  <div className="rounded-full bg-[#061B78]/10 p-3">
                    <DollarSign className="h-6 w-6 text-[#061B78]" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">+12.5%</span>
                  <span className="ml-2 text-gray-500">vs last month</span>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Monthly Expenses</p>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">$3,456</h2>
                  </div>
                  <div className="rounded-full bg-[#061B78]/10 p-3">
                    <CreditCard className="h-6 w-6 text-[#061B78]" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <ArrowDownRight className="mr-1 h-4 w-4 text-red-600" />
                  <span className="font-medium text-red-600">-2.3%</span>
                  <span className="ml-2 text-gray-500">vs last month</span>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Savings</p>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">$8,888</h2>
                  </div>
                  <div className="rounded-full bg-[#061B78]/10 p-3">
                    <PiggyBank className="h-6 w-6 text-[#061B78]" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">+5.7%</span>
                  <span className="ml-2 text-gray-500">vs last month</span>
                </div>
              </Card>
            </motion.div>

            <motion.div variants={item}>
              <Card className="bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Investment Returns</p>
                    <h2 className="mt-1 text-3xl font-bold tracking-tight text-gray-900">$1,234</h2>
                  </div>
                  <div className="rounded-full bg-[#061B78]/10 p-3">
                    <TrendingUp className="h-6 w-6 text-[#061B78]" />
                  </div>
                </div>
                <div className="mt-4 flex items-center text-sm">
                  <ArrowUpRight className="mr-1 h-4 w-4 text-green-600" />
                  <span className="font-medium text-green-600">+8.2%</span>
                  <span className="ml-2 text-gray-500">vs last month</span>
                </div>
              </Card>
            </motion.div>
          </div>

          <motion.div variants={item}>
            <Card className="bg-white p-6">
              <div className="mb-6">
                <h3 className="text-xl font-semibold tracking-tight text-gray-900">Upcoming Bills</h3>
                <p className="mt-1 text-sm text-gray-500">Payments due soon</p>
              </div>
              <div className="space-y-6">
                {[
                  { name: "Rent", amount: "$1,200", dueDate: "Due in 5 days" },
                  { name: "Electricity", amount: "$89", dueDate: "Due in 7 days" },
                  { name: "Internet", amount: "$59", dueDate: "Due in 10 days" },
                  { name: "Phone Bill", amount: "$45", dueDate: "Due in 12 days" },
                ].map((bill, index) => (
                  <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium text-gray-900">{bill.name}</p>
                      <p className="text-sm text-gray-500">{bill.dueDate}</p>
                    </div>
                    <p className="text-lg font-semibold text-gray-900">{bill.amount}</p>
                  </div>
                ))}
              </div>
            </Card>
          </motion.div>
        </div>

        <motion.div variants={item} className="lg:col-span-1">
          <Card className="bg-white p-6">
            <div className="mb-6">
              <h3 className="text-xl font-semibold tracking-tight text-gray-900">Recent Expenses</h3>
              <p className="mt-1 text-sm text-gray-500">Your latest transactions</p>
            </div>
            <div className="space-y-6">
              {[
                { name: "Grocery Shopping", amount: "$123", date: "Today" },
                { name: "Netflix Subscription", amount: "$15", date: "Yesterday" },
                { name: "Gas Station", amount: "$45", date: "2 days ago" },
                { name: "Restaurant", amount: "$89", date: "3 days ago" },
              ].map((expense, index) => (
                <div key={index} className="flex items-center justify-between border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div>
                    <p className="font-medium text-gray-900">{expense.name}</p>
                    <p className="text-sm text-gray-500">{expense.date}</p>
                  </div>
                  <p className="text-lg font-semibold text-gray-900">{expense.amount}</p>
                </div>
              ))}
            </div>
          </Card>
        </motion.div>
      </div>
    </motion.div>
  )
} 