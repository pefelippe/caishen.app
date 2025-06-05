"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Search, Filter, Download } from "lucide-react"
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

const mockSalaries = [
  {
    id: 1,
    amount: 5000.00,
    date: new Date("2024-03-15"),
    type: "Regular",
    status: "paid",
    deductions: 1250.00,
    netAmount: 3750.00,
  },
  {
    id: 2,
    amount: 5000.00,
    date: new Date("2024-02-15"),
    type: "Regular",
    status: "paid",
    deductions: 1250.00,
    netAmount: 3750.00,
  },
  {
    id: 3,
    amount: 5500.00,
    date: new Date("2024-01-15"),
    type: "Bonus",
    status: "paid",
    deductions: 1375.00,
    netAmount: 4125.00,
  },
]

export default function SalaryPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredSalaries = mockSalaries.filter((salary) =>
    salary.type.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return <Badge variant="default">Paid</Badge>
      case "pending":
        return <Badge variant="secondary">Pending</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Salary</h1>
        <Button variant="outline">
          <Download className="mr-2 h-4 w-4" />
          Export Salary Report
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Salary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$5,000.00</div>
            <p className="text-xs text-gray-500">Monthly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">YTD Earnings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$15,500.00</div>
            <p className="text-xs text-gray-500">+10% from last year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Average Deductions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$1,291.67</div>
            <p className="text-xs text-gray-500">Monthly</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Next Payment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">$3,750.00</div>
            <p className="text-xs text-gray-500">Due Apr 15, 2024</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Salary History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
              <Input
                placeholder="Search salary records..."
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
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Gross Amount</TableHead>
                <TableHead>Deductions</TableHead>
                <TableHead>Net Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSalaries.map((salary) => (
                <TableRow key={salary.id}>
                  <TableCell>{format(salary.date, "MMM dd, yyyy")}</TableCell>
                  <TableCell className="font-medium">{salary.type}</TableCell>
                  <TableCell>${salary.amount.toFixed(2)}</TableCell>
                  <TableCell>${salary.deductions.toFixed(2)}</TableCell>
                  <TableCell>${salary.netAmount.toFixed(2)}</TableCell>
                  <TableCell>{getStatusBadge(salary.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
} 