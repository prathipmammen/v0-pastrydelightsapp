"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"

// Static credentials
const STATIC_CREDENTIALS = {
  username: "dinudixon",
  password: "Boost#1992",
}

interface AuthContextType {
  isAuthenticated: boolean
  isLoading: boolean
  signIn: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  failedAttempts: number
  isLocked: boolean
  lockoutTime: number | null
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<number | null>(null)

  // Check if user is already authenticated on mount
  useEffect(() => {
    const authStatus = localStorage.getItem("isAuthenticated")
    const authTime = localStorage.getItem("authTime")

    if (authStatus === "true" && authTime) {
      const loginTime = Number.parseInt(authTime)
      const now = Date.now()
      const twentyFourHours = 24 * 60 * 60 * 1000

      // Session expires after 24 hours
      if (now - loginTime < twentyFourHours) {
        setIsAuthenticated(true)
      } else {
        localStorage.removeItem("isAuthenticated")
        localStorage.removeItem("authTime")
      }
    }

    setIsLoading(false)
  }, [])

  // Check lockout status
  useEffect(() => {
    const checkLockout = () => {
      const lockoutEnd = localStorage.getItem("lockoutEnd")
      if (lockoutEnd) {
        const lockoutEndTime = Number.parseInt(lockoutEnd)
        if (Date.now() < lockoutEndTime) {
          setIsLocked(true)
          setLockoutTime(lockoutEndTime)
        } else {
          localStorage.removeItem("lockoutEnd")
          localStorage.removeItem("failedAttempts")
          setIsLocked(false)
          setLockoutTime(null)
          setFailedAttempts(0)
        }
      }
    }

    checkLockout()
    const interval = setInterval(checkLockout, 1000)
    return () => clearInterval(interval)
  }, [])

  // Load failed attempts from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("failedAttempts")
    if (stored) {
      setFailedAttempts(Number.parseInt(stored))
    }
  }, [])

  // Handle failed login attempt
  const handleFailedAttempt = () => {
    const newAttempts = failedAttempts + 1
    setFailedAttempts(newAttempts)
    localStorage.setItem("failedAttempts", newAttempts.toString())

    if (newAttempts >= 5) {
      const lockoutEnd = Date.now() + 15 * 60 * 1000 // 15 minutes
      setIsLocked(true)
      setLockoutTime(lockoutEnd)
      localStorage.setItem("lockoutEnd", lockoutEnd.toString())
    }
  }

  // Reset failed attempts on successful login
  const resetFailedAttempts = () => {
    setFailedAttempts(0)
    localStorage.removeItem("failedAttempts")
    localStorage.removeItem("lockoutEnd")
    setIsLocked(false)
    setLockoutTime(null)
  }

  // Sign in with username and password
  const signIn = async (username: string, password: string) => {
    if (isLocked) {
      throw new Error("Account is temporarily locked. Please try again later.")
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    if (username === STATIC_CREDENTIALS.username && password === STATIC_CREDENTIALS.password) {
      setIsAuthenticated(true)
      localStorage.setItem("isAuthenticated", "true")
      localStorage.setItem("authTime", Date.now().toString())
      resetFailedAttempts()
    } else {
      handleFailedAttempt()
      throw new Error("Invalid username or password.")
    }
  }

  // Sign out
  const signOut = async () => {
    setIsAuthenticated(false)
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("authTime")
  }

  const value = {
    isAuthenticated,
    isLoading,
    signIn,
    signOut,
    failedAttempts,
    isLocked,
    lockoutTime,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
