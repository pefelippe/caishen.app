"use client"

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  ListChecks,
  PlusCircle,
  Calendar,
  Filter,
  HelpCircle,
  Settings,
  User,
  CreditCard,
  BarChart3,
  Receipt,
  Tag,
  Bell,
  Coins,
} from 'lucide-react'
import { UserMenu } from './UserMenu'

const menu = [
  {
    title: "Dashboard",
    items: [
      {
        title: "Overview",
        href: "/app/dashboard",
        icon: LayoutDashboard,
      },
      {
        title: "Expenses",
        href: "/app/dashboard/expenses",
        icon: ListChecks,
      },
      {
        title: "Add Expense",
        href: "/app/dashboard/expenses/new",
        icon: PlusCircle,
      },
      {
        title: "Calendar View",
        href: "/app/dashboard/calendar",
        icon: Calendar,
      },
      {
        title: "Filters",
        href: "/app/dashboard/filters",
        icon: Filter,
      },
    ],
  },
  {
    title: "Analytics",
    items: [
      {
        title: "Reports",
        href: "/app/analytics/reports",
        icon: BarChart3,
      },
      {
        title: "Categories",
        href: "/app/analytics/categories",
        icon: Tag,
      },
      {
        title: "Trends",
        href: "/app/analytics/trends",
        icon: Receipt,
      },
    ],
  },
  {
    title: "Settings",
    items: [
      {
        title: "Profile",
        href: "/app/profile",
        icon: User,
      },
      {
        title: "Billing",
        href: "/app/billing",
        icon: CreditCard,
      },
      {
        title: "Notifications",
        href: "/app/notifications",
        icon: Bell,
      },
      {
        title: "Preferences",
        href: "/app/settings",
        icon: Settings,
      },
    ],
  },
  {
    title: "Support",
    items: [
      {
        title: "Help Center",
        href: "/app/help",
        icon: HelpCircle,
      },
    ],
  },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <div className="fixed inset-y-0 left-0 z-40 flex w-[300px] flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-950">
      <div className="mt-6 px-6">
        <Link href="/app/dashboard" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600">
            <Coins className="h-5 w-5 text-white" />
          </div>
          <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">Caishen</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="space-y-6 px-4 py-6">
          {menu.map((section) => (
            <div key={section.title}>
              <h2 className="mb-2 px-3 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                {section.title}
              </h2>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                        isActive
                          ? "bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100"
                      )}
                    >
                      <item.icon className={cn(
                        "h-4 w-4",
                        isActive 
                          ? "text-indigo-600 dark:text-indigo-400" 
                          : "text-gray-500 dark:text-gray-400"
                      )} />
                      {item.title}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>
      </div>
      <div className="border-t border-gray-200 dark:border-gray-800">
        <div className="p-4">
          <UserMenu />
        </div>
      </div>
    </div>
  )
} 