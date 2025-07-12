"use client"

import { Target, LogOut, Home, Receipt } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { handleLogout } from "@/lib/firebase"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"

const mainNavItems = [
  {
    title: "Dashboard",
    href: "/app/dashboard",
    icon: Home,
  },
  {
    title: "Gastos",
    href: "/app/expenses",
    icon: Receipt,
  },
  {
    title: "Metas",
    href: "/app/goals",
    icon: Target,
  },
]

export function AppHeader() {
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
    <header className="transition-shadows sticky top-0 z-30 flex w-full justify-between p-4 sm:p-6 lg:p-8 px-4 sm:px-8 lg:px-16 outline outline-1 outline-slate-400/0 backdrop-blur-xl duration-300 bg-transparent">
      <div className="flex items-center delay-75">
        <Link href="/app/dashboard" className="group flex items-center outline-none" tabIndex={-1} aria-label="Go to dashboard">
          <div className="text-lg sm:text-xl lg:text-2xl font-bold text-slate-700 leading-tighter">caishen.app</div>
        </Link>
      </div>

      <nav className="hidden sm:flex items-center justify-center space-x-4 lg:space-x-7 delay-75">
        {mainNavItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center text-sm lg:text-lg font-medium transition-colors hover:text-slate-600 px-2 lg:px-3 py-2 rounded-lg",
              pathname === item.href
                ? "text-slate-700 bg-slate-100"
                : "text-slate-500 hover:bg-slate-50/80"
            )}
          >
            <item.icon className="mr-1 lg:mr-2 h-3 w-3 lg:h-4 lg:w-4" />
            <span className="hidden lg:inline">{item.title}</span>
          </Link>
        ))}
      </nav>

      <div className="flex items-center delay-75">
        <Button 
          variant="ghost" 
          onClick={handleSignOut}
          className="flex items-center gap-1 lg:gap-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100/80 px-2 lg:px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
        >
          <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
          <span className="hidden sm:inline font-medium text-sm lg:text-base">Log out</span>
        </Button>
      </div>
    </header>
  )
} 