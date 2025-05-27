'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { User, Settings, LogOut, ChevronDown, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

export function UserMenu() {
  const router = useRouter();
  const { displayName, email, photoURL, initials } = useAuth();
  const { setTheme, theme } = useTheme();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex w-full items-center gap-4 rounded-lg px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900">
        <Avatar className="h-8 w-8">
          <AvatarImage src={photoURL} alt={displayName} />
          <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 overflow-hidden">
          <p className="truncate text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
          <p className="truncate text-xs text-gray-500 dark:text-gray-400">{email}</p>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-500 dark:text-gray-400" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[300px] bg-white dark:bg-gray-950 border border-gray-200 dark:border-gray-800 shadow-lg">
        <div className="flex items-center gap-4 p-4 border-b border-gray-100 dark:border-gray-800">
          <Avatar className="h-12 w-12">
            <AvatarImage src={photoURL} alt={displayName} />
            <AvatarFallback className="bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-400">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{displayName}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{email}</p>
          </div>
        </div>
        <div className="p-2">
          <DropdownMenuItem 
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer rounded-md"
            onClick={() => router.push('/app/profile')}
          >
            <User className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span>Profile</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer rounded-md"
            onClick={() => router.push('/app/settings')}
          >
            <Settings className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            <span>Settings</span>
          </DropdownMenuItem>
          <DropdownMenuSeparator className="my-2 bg-gray-100 dark:bg-gray-800" />
          <DropdownMenuItem 
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-50 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-gray-100 cursor-pointer rounded-md"
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          >
            {theme === 'dark' ? (
              <Sun className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            ) : (
              <Moon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
            )}
            <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>
          </DropdownMenuItem>
          <DropdownMenuItem 
            className="flex items-center gap-3 px-3 py-2.5 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/50 dark:hover:text-red-300 cursor-pointer rounded-md"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign out</span>
          </DropdownMenuItem>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
} 