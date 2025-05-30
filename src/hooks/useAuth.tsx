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
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  displayName: "",
  email: null,
  photoURL: null,
  initials: "",
  loading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user)
      setLoading(false)
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
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
} 