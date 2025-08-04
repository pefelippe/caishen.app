"use client"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { usePathname } from "next/navigation"
import Link from "next/link"
import {
  LayoutDashboard,
  Receipt,
  FileText,
  DollarSign,
} from "lucide-react"

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/app/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Expenses",
    href: "/app/expenses",
    icon: Receipt,
  },
  {
    title: "Bills",
    href: "/app/bills",
    icon: FileText,
  },
  {
    title: "Income",
    href: "/app/income",
    icon: DollarSign,
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-screen flex-col border-r border-gray-800 bg-gray-900">
      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-4">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight text-gray-200">
              Main Navigation
            </h2>
            <div className="space-y-1">
              {mainNavItems.map((item) => (
                <Button
                  key={item.href}
                  variant={pathname === item.href ? "secondary" : "ghost"}
                  className={cn(
                    "w-full justify-start text-gray-300 hover:text-white hover:bg-gray-800",
                    pathname === item.href && "bg-gray-800 text-white"
                  )}
                  asChild
                >
                  <Link href={item.href}>
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </Link>
                </Button>
              ))}
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  )
} 