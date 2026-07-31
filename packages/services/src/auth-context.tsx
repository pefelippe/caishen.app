"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSession } from "./auth-client";

export interface AuthUser {
  id: string;
  email: string;
  displayName?: string;
  image?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { data, isPending } = useSession();

  const user: AuthUser | null = data?.user
    ? {
        id: data.user.id,
        email: data.user.email,
        displayName: data.user.name ?? undefined,
        image: data.user.image ?? undefined,
      }
    : null;

  const value: AuthContextType = {
    user,
    loading: isPending,
    isAuthenticated: !!user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
