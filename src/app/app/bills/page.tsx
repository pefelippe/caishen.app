"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Plus, Search, Filter } from "lucide-react"
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

// Mock data - replace with real data from your backend
const mockBills = [
  {
    id: 1,
    name: "Rent",
    amount: 1200.00,
    dueDate: new Date("2024-04-01"),
    status: "upcoming",
    category: "Housing",
  },
  {
    id: 2,
    name: "Electricity Bill",
    amount: 85.50,
    dueDate: new Date("2024-03-25"),
    status: "paid",
    category: "Utilities",
  },
  {
    id: 3,
    name: "Internet",
    amount: 59.99,
    dueDate: new Date("2024-03-20"),
    status: "overdue",
    category: "Utilities",
  },
]

export default function BillsPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredBills = mockBills.filter((bill) =>
    bill.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bill.category.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Paid</Badge>
      case "upcoming":
        return <Badge variant="secondary">Upcoming</Badge>
      case "overdue":
        return <Badge variant="destructive">Overdue</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Bills</h1>
        <Button className="bg-[#061B78] hover:bg-[#061B78]/90">
          <Plus className="mr-2 h-4 w-4" />
          Add Bill
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Bills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search bills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filter
            </Button>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBills.map((bill) => (
                <TableRow key={bill.id}>
                  <TableCell className="font-medium">{bill.name}</TableCell>
                  <TableCell>{bill.category}</TableCell>
                  <TableCell>${bill.amount.toFixed(2)}</TableCell>
                  <TableCell>{format(bill.dueDate, "MMM dd, yyyy")}</TableCell>
                  <TableCell>{getStatusBadge(bill.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 