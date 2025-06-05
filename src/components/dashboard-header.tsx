"use client"

import { useState } from "react"
import { Bell, ChevronDown, User, CreditCard, Lock, HelpCircle, LogOut, LayoutDashboard, Receipt, FileText, DollarSign, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useAuth } from "@/hooks/useAuth"
import { handleLogout } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

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

export function DashboardHeader() {
  const { user } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [notifications, setNotifications] = useState(3) // Mock notifications count

  const handleSignOut = async () => {
    const success = await handleLogout()
    if (success) {
      router.push("/login")
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
  }

  return (
    <header className="border-b border-gray-200 bg-white">
      <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-extrabold text-[#061B78]">Caishen</span>
        </div>

        <nav className="mx-6 flex items-center space-x-4 lg:space-x-6">
          {mainNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center text-sm font-medium transition-colors hover:text-[#061B78]",
                pathname === item.href
                  ? "text-[#061B78]"
                  : "text-gray-500"
              )}
            >
              <item.icon className="mr-2 h-4 w-4" />
              {item.title}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="relative">
            <Input
              type="search"
              placeholder="Search..."
              className="w-[300px]"
            />
            <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative text-[#061B78] hover:text-[#061B78] hover:bg-gray-100">
                <Bell className="h-5 w-5" />
                <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] text-white">
                  {notifications}
                </span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
              <DropdownMenuLabel>Notifications</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="max-h-[300px] overflow-y-auto">
                <DropdownMenuItem className="flex items-start gap-3 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/01.png" alt="User" />
                    <AvatarFallback>JD</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#061B78]">John Doe</p>
                    <p className="text-xs text-gray-500">Added a new expense</p>
                    <p className="text-xs text-gray-400">2 minutes ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-start gap-3 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/02.png" alt="User" />
                    <AvatarFallback>AS</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#061B78]">Alice Smith</p>
                    <p className="text-xs text-gray-500">Updated budget settings</p>
                    <p className="text-xs text-gray-400">1 hour ago</p>
                  </div>
                </DropdownMenuItem>
                <DropdownMenuItem className="flex items-start gap-3 p-3">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src="/avatars/03.png" alt="User" />
                    <AvatarFallback>RJ</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 space-y-1">
                    <p className="text-sm font-medium text-[#061B78]">Robert Johnson</p>
                    <p className="text-xs text-gray-500">Shared a report with you</p>
                    <p className="text-xs text-gray-400">3 hours ago</p>
                  </div>
                </DropdownMenuItem>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="justify-center text-sm text-[#061B78]">
                View all notifications
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-[#061B78] hover:text-[#061B78] hover:bg-gray-100">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                  <AvatarFallback>{user?.displayName?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{user?.displayName || "User"}</span>
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/app/profile")} className="text-[#061B78]">
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/billing")} className="text-[#061B78]">
                <CreditCard className="mr-2 h-4 w-4" />
                My Plan
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/password")} className="text-[#061B78]">
                <Lock className="mr-2 h-4 w-4" />
                Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/app/notifications")} className="text-[#061B78]">
                <Bell className="mr-2 h-4 w-4" />
                Notifications
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push("/app/help")} className="text-[#061B78]">
                <HelpCircle className="mr-2 h-4 w-4" />
                Help Center
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} className="text-[#061B78]">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
} 