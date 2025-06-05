"use client"

import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/useAuth"
import { handleLogout } from "@/lib/firebase"
import { Menu, X } from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"

export function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isScrolled, setIsScrolled] = useState(false)
  const { user, loading } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [isLocalhost, setIsLocalhost] = useState(true)

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 0)
    }

    setIsLocalhost(window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    window.addEventListener("scroll", handleScroll)
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  const handleSignOut = async () => {
    const success = await handleLogout()
    if (success) {
      router.push("/login")
    }
  }

  const isAppRoute = pathname?.startsWith("/app")

  if (isAppRoute) {
    return null
  }

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-200 ${
        isScrolled ? "bg-white shadow-md" : "bg-transparent"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-[#061B78]">
              Caishen
            </Link>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-8">
            {user ? (
              <Button
                onClick={handleSignOut}
                variant="outline"
                className="border-gray-200 hover:bg-gray-50"
              >
                Sign Out
              </Button>
            ) : (
              isLocalhost && (
                <Button
                  onClick={() => router.push("/login")}
                  className="bg-[#061B78] text-white hover:bg-[#061B78]/90"
                >
                  Get Started
                </Button>
              )
            )}
          </nav>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="text-gray-600 hover:text-gray-900"
            >
              {isMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {isMenuOpen && (
        <div className="md:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1 bg-white shadow-lg">
            {user ? (
              <button
                onClick={() => {
                  handleSignOut()
                  setIsMenuOpen(false)
                }}
                className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900"
              >
                Sign Out
              </button>
            ) : (
              isLocalhost && (
                <button
                  onClick={() => {
                    router.push("/login")
                    setIsMenuOpen(false)
                  }}
                  className="block w-full text-left px-3 py-2 text-gray-600 hover:text-gray-900"
                >
                  Get Started
                </button>
              )
            )}
          </div>
        </div>
      )}
    </header>
  )
} 