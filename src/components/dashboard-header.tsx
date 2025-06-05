"use client"

import { ChevronDown, User, CreditCard, Lock, HelpCircle, LogOut, LayoutDashboard, Receipt, FileText, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
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
    <header className="border-b border-gray-200 ">
      <div className="flex h-[5vh] py-5 items-center px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-2">
          <span className="text-3xl font-extrabold text-[#061B78]">Caishen</span>
        </div>

        <nav className="mx-auto flex items-center space-x-4 lg:space-x-12">
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
              <item.icon className="mr-2 h-5 w-5" />
              {item.title}
            </Link>
          ))}
        </nav>

        <div className=" flex items-center gap-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 text-[#061B78] hover:text-[#061B78] hover:bg-gray-100">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.photoURL || ""} alt={user?.displayName || ""} />
                  <AvatarFallback>{user?.displayName ? getInitials(user.displayName) : "U"}</AvatarFallback>
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