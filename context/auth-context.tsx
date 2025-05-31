"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged, type User } from "firebase/auth"
import { auth } from "@/lib/firebase"
import { useRouter } from "next/navigation"

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  is2FAVerified: boolean
  isLoading: boolean
  error: string | null
  allowedPhoneNumbers: string[]
  login: (email: string, password: string) => Promise<boolean>
  verify2FA: (code: string, phoneNumber: string) => Promise<boolean>
  signOut: () => Promise<void>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Admin credentials
const ADMIN_EMAILS = ["prathipmammen@gmail.com", "dinudixon@yahoo.com"]
const ADMIN_PASSWORD = "Boost#1992"
const ADMIN_PHONES = ["6309033154", "9728046540"]

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [is2FAVerified, setIs2FAVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsAuthenticated(!!user && ADMIN_EMAILS.includes(user.email || ""))

      // Check if 2FA is verified from session storage
      const twoFAVerified = sessionStorage.getItem("2fa_verified") === "true"
      setIs2FAVerified(twoFAVerified && !!user)

      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!ADMIN_EMAILS.includes(email)) {
        setError("Access denied. You are not authorized to access this application.")
        setIsLoading(false)
        return false
      }

      await signInWithEmailAndPassword(auth, email, password)
      sessionStorage.removeItem("2fa_verified")
      setIs2FAVerified(false)
      setIsLoading(false)
      return true
    } catch (error: any) {
      setError("Invalid email or password. Please try again.")
      setIsLoading(false)
      return false
    }
  }

  const verify2FA = async (code: string, phoneNumber: string): Promise<boolean> => {
    try {
      setIsLoading(true)
      setError(null)

      if (!ADMIN_PHONES.includes(phoneNumber)) {
        setError("This phone number is not authorized for 2FA verification.")
        setIsLoading(false)
        return false
      }

      if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        setError("Invalid verification code. Please try again.")
        setIsLoading(false)
        return false
      }

      sessionStorage.setItem("2fa_verified", "true")
      setIs2FAVerified(true)
      setIsLoading(false)
      return true
    } catch (error) {
      setError("Failed to verify code. Please try again.")
      setIsLoading(false)
      return false
    }
  }

  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      sessionStorage.removeItem("2fa_verified")
      setIs2FAVerified(false)
      setError(null)
      router.push("/login")
    } catch (error) {
      setError("Failed to sign out. Please try again.")
    }
  }

  const clearError = () => {
    setError(null)
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated,
        is2FAVerified,
        isLoading,
        error,
        allowedPhoneNumbers: ADMIN_PHONES,
        login,
        verify2FA,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
