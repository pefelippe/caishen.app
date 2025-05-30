import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { PlusCircle } from "lucide-react"
import Link from "next/link"

// Mock data - replace with real data from your backend
const expenses = [
  {
    id: 1,
    description: "Groceries",
    amount: 150.00,
    category: "Food",
    date: "2024-03-15",
    recurring: "Monthly"
  },
  {
    id: 2,
    description: "Netflix Subscription",
    amount: 29.99,
    category: "Entertainment",
    date: "2024-03-14",
    recurring: "Monthly"
  },
  {
    id: 3,
    description: "Gas",
    amount: 45.00,
    category: "Transportation",
    date: "2024-03-13",
    recurring: "Weekly"
  },
  {
    id: 4,
    description: "Restaurant",
    amount: 75.50,
    category: "Food",
    date: "2024-03-12",
    recurring: "None"
  }
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Overview</h1>
        <Link href="/app/dashboard/expenses/new">
          <Button className="gap-2">
            <PlusCircle className="h-4 w-4" />
            Add Expense
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Description</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Recurring</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {expenses.map((expense) => (
                <TableRow key={expense.id}>
                  <TableCell>{expense.description}</TableCell>
                  <TableCell>${expense.amount.toFixed(2)}</TableCell>
                  <TableCell>{expense.category}</TableCell>
                  <TableCell>{expense.date}</TableCell>
                  <TableCell>{expense.recurring}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 