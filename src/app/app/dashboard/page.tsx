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
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Dashboard Overview</h1>
      <p className="text-gray-500">Welcome to your dashboard</p>
    </div>
  )
} 