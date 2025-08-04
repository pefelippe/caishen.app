'use client';

import { LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { handleLogout } from "@/lib/firebase"

export default function LogoutButton() {
  const handleLogoutClick = async () => {
    const success = await handleLogout()
    if (success) {
      window.location.href = "/login"
    }
  };

  return (
    <Button 
      variant="ghost" 
      onClick={handleLogoutClick}
      className="flex items-center gap-1 lg:gap-2 text-slate-600 hover:text-slate-700 hover:bg-slate-100/80 px-2 lg:px-3 py-2 rounded-lg transition-all duration-200 cursor-pointer"
    >
      <LogOut className="h-3 w-3 lg:h-4 lg:w-4" />
      <span className="hidden sm:inline font-medium text-sm lg:text-base">Log out</span>
    </Button>
  );
} 