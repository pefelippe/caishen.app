"use client"

import { Card } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"

const expenses = [
  {
    id: 1,
    description: "Grocery Shopping",
    amount: 123.45,
    category: "Food",
    date: new Date(),
    status: "completed"
  },
  {
    id: 2,
    description: "Netflix Subscription",
    amount: 15.99,
    category: "Entertainment",
    date: new Date(),
    status: "completed"
  },
  {
    id: 3,
    description: "Gas Station",
    amount: 45.00,
    category: "Transportation",
    date: new Date(),
    status: "pending"
  },
  {
    id: 4,
    description: "Restaurant",
    amount: 89.50,
    category: "Food",
    date: new Date(),
    status: "completed"
  },
]

export default function ExpensesPage() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">Expenses</h1>
        <p className="text-lg text-gray-500">Track and manage your expenses</p>
      </div>

      <Card className="bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow key={expense.id}>
                <TableCell className="font-medium">{expense.description}</TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>${expense.amount.toFixed(2)}</TableCell>
                <TableCell>{format(expense.date, "MMM dd, yyyy")}</TableCell>
                <TableCell>
                  <Badge variant={expense.status === "completed" ? "default" : "secondary"}>
                    {expense.status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
} 