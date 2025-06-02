"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  username: string
  displayName: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  login: (username: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  isLoading: boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Static credentials
const VALID_CREDENTIALS = {
  username: "dinudixon",
  password: "Boost#1992",
  displayName: "Dinu Dixon",
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [lockoutUntil, setLockoutUntil] = useState<number | null>(null)

  useEffect(() => {
    // Check for existing session
    const storedUser = localStorage.getItem("pastry-delights-user")
    const sessionExpiry = localStorage.getItem("pastry-delights-session-expiry")

    if (storedUser && sessionExpiry) {
      const now = Date.now()
      if (now < Number.parseInt(sessionExpiry)) {
        setUser(JSON.parse(storedUser))
      } else {
        // Session expired
        localStorage.removeItem("pastry-delights-user")
        localStorage.removeItem("pastry-delights-session-expiry")
      }
    }

    // Check lockout status
    const storedLockout = localStorage.getItem("pastry-delights-lockout")
    const storedAttempts = localStorage.getItem("pastry-delights-failed-attempts")

    if (storedLockout) {
      const lockoutTime = Number.parseInt(storedLockout)
      if (Date.now() < lockoutTime) {
        setLockoutUntil(lockoutTime)
      } else {
        localStorage.removeItem("pastry-delights-lockout")
        localStorage.removeItem("pastry-delights-failed-attempts")
        setFailedAttempts(0)
      }
    }

    if (storedAttempts) {
      setFailedAttempts(Number.parseInt(storedAttempts))
    }

    setIsLoading(false)
  }, [])

  const login = async (username: string, password: string): Promise<void> => {
    // Check if account is locked
    if (lockoutUntil && Date.now() < lockoutUntil) {
      const remainingTime = Math.ceil((lockoutUntil - Date.now()) / 1000 / 60)
      throw new Error(`Account locked. Try again in ${remainingTime} minutes.`)
    }

    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Validate credentials
    if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
      const userData: User = {
        username: VALID_CREDENTIALS.username,
        displayName: VALID_CREDENTIALS.displayName,
      }

      setUser(userData)

      // Store session (24 hours)
      const sessionExpiry = Date.now() + 24 * 60 * 60 * 1000
      localStorage.setItem("pastry-delights-user", JSON.stringify(userData))
      localStorage.setItem("pastry-delights-session-expiry", sessionExpiry.toString())

      // Clear failed attempts
      setFailedAttempts(0)
      localStorage.removeItem("pastry-delights-failed-attempts")
      localStorage.removeItem("pastry-delights-lockout")
      setLockoutUntil(null)
    } else {
      // Handle failed login
      const newFailedAttempts = failedAttempts + 1
      setFailedAttempts(newFailedAttempts)
      localStorage.setItem("pastry-delights-failed-attempts", newFailedAttempts.toString())

      if (newFailedAttempts >= 5) {
        // Lock account for 15 minutes
        const lockoutTime = Date.now() + 15 * 60 * 1000
        setLockoutUntil(lockoutTime)
        localStorage.setItem("pastry-delights-lockout", lockoutTime.toString())
        throw new Error("Too many failed attempts. Account locked for 15 minutes.")
      }

      throw new Error("Invalid username or password")
    }
  }

  const signOut = async (): Promise<void> => {
    setUser(null)
    localStorage.removeItem("pastry-delights-user")
    localStorage.removeItem("pastry-delights-session-expiry")
  }

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    signOut,
    isLoading,
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
