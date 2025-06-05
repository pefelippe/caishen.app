"use client"

import { Plus, ArrowDownRight, ArrowUpRight, PiggyBank, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useRouter } from "next/navigation"

const quickActions = [
  {
    title: "Add Expense",
    href: "/app/expenses/new",
    icon: ArrowDownRight,
    description: "Record a new expense",
  },
  {
    title: "Add Income",
    href: "/app/income/new",
    icon: ArrowUpRight,
    description: "Record a new income",
  },
  {
    title: "Add Savings Goal",
    href: "/app/savings/new",
    icon: PiggyBank,
    description: "Create a new savings goal",
  },
  {
    title: "Add Investment",
    href: "/app/investments/new",
    icon: DollarSign,
    description: "Record a new investment",
  },
]

export function QuickActionsModal() {
  const router = useRouter()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          className="fixed bottom-16 right-16 h-16 w-16 rounded-full bg-[#061B78] text-white shadow-lg hover:bg-[#061B78]/90 cursor-pointer"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-84">
        <DropdownMenuLabel>Quick Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {quickActions.map((action) => (
          <DropdownMenuItem
            key={action.href}
            className="flex items-center gap-4 p-4 cursor-pointer"
            onClick={() => router.push(action.href)}
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#061B78]/10">
              <action.icon className="h-5 w-5 text-[#061B78]" />
            </div>
            <div className="flex flex-col items-start">
              <span className="font-medium">{action.title}</span>
              <span className="text-sm text-gray-500">{action.description}</span>
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
} 