"use client"

import * as React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { auth } from "../lib/firebase"
import { User } from "firebase/auth"

interface AuthContextType {
  user: User | null
  displayName: string
  email: string | null
  photoURL: string | null
  initials: string
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  displayName: "",
  email: null,
  photoURL: null,
  initials: "",
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
    })

    return () => unsubscribe()
  }, [])

  const displayName = user?.displayName || "Guest"
  const email = user?.email || null
  const photoURL = user?.photoURL || null
  const initials = displayName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()

  return (
    <AuthContext.Provider
      value={{
        user,
        displayName,
        email,
        photoURL,
        initials,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 