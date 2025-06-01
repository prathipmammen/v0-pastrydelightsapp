"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { type User, signInWithEmailAndPassword, signOut as firebaseSignOut, onAuthStateChanged } from "firebase/auth"
import { auth } from "./firebase"
import { getCredentialIdForUser } from "./webauthn"

// Allowed users configuration
const ALLOWED_USERS = {
  "prathipmammen@gmail.com": {
    phone: "6309033154",
    name: "Prathip",
  },
  "dinudixon@yahoo.com": {
    phone: "9728046540",
    name: "Dinu",
  },
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  isPhoneVerified: boolean
  isLoading: boolean
  signIn: (email: string, password: string) => Promise<void>
  signOut: () => Promise<void>
  sendSMSCode: (phoneNumber: string) => Promise<void>
  verifySMSCode: (code: string) => Promise<void>
  failedAttempts: number
  isLocked: boolean
  lockoutTime: number | null
  currentUserPhone: string | null
  simulatePhoneVerification: (phoneNumber: string, code: string) => Promise<void>
  hasFaceId: boolean
  canUseFaceId: boolean
  checkFaceIdAvailability: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Simulated SMS codes for development/demo purposes
const DEMO_SMS_CODES = {
  "6309033154": "123456",
  "9728046540": "654321",
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isPhoneVerified, setIsPhoneVerified] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [failedAttempts, setFailedAttempts] = useState(0)
  const [isLocked, setIsLocked] = useState(false)
  const [lockoutTime, setLockoutTime] = useState<number | null>(null)
  const [currentUserPhone, setCurrentUserPhone] = useState<string | null>(null)
  const [sentCode, setSentCode] = useState<string | null>(null)
  const [sentToPhone, setSentToPhone] = useState<string | null>(null)
  const [hasFaceId, setHasFaceId] = useState(false)
  const [canUseFaceId, setCanUseFaceId] = useState(false)

  // Check if email is allowed
  const isEmailAllowed = (email: string): boolean => {
    return email.toLowerCase() in ALLOWED_USERS
  }

  // Get phone number for email
  const getPhoneForEmail = (email: string): string | null => {
    const normalizedEmail = email.toLowerCase()
    return ALLOWED_USERS[normalizedEmail as keyof typeof ALLOWED_USERS]?.phone || null
  }

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

  // Sign in with email and password
  const signIn = async (email: string, password: string) => {
    if (isLocked) {
      throw new Error("Account is temporarily locked. Please try again later.")
    }

    if (!isEmailAllowed(email)) {
      handleFailedAttempt()
      throw new Error("This email is not authorized to access the system.")
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password)
      setUser(userCredential.user)
      setIsAuthenticated(true)
      setCurrentUserPhone(getPhoneForEmail(email))
      resetFailedAttempts()
    } catch (error: any) {
      handleFailedAttempt()
      if (error.code === "auth/user-not-found") {
        throw new Error("No account found with this email address.")
      } else if (error.code === "auth/wrong-password") {
        throw new Error("Incorrect password.")
      } else if (error.code === "auth/invalid-email") {
        throw new Error("Invalid email address.")
      } else if (error.code === "auth/too-many-requests") {
        throw new Error("Too many failed attempts. Please try again later.")
      } else if (error.code === "auth/invalid-credential") {
        throw new Error("Invalid email or password.")
      } else {
        throw new Error("Authentication failed. Please check your credentials.")
      }
    }
  }

  // Simulate sending SMS code (since Firebase Phone Auth is not enabled)
  const sendSMSCode = async (phoneNumber: string) => {
    try {
      // Validate phone number is allowed
      const allowedPhones = Object.values(ALLOWED_USERS).map((u) => u.phone)
      if (!allowedPhones.includes(phoneNumber)) {
        throw new Error("This phone number is not authorized.")
      }

      // Simulate sending SMS with a delay
      await new Promise((resolve) => setTimeout(resolve, 1500))

      // Store the demo code for this phone number
      const demoCode = DEMO_SMS_CODES[phoneNumber as keyof typeof DEMO_SMS_CODES]
      setSentCode(demoCode)
      setSentToPhone(phoneNumber)

      console.log(`Demo SMS Code for ${phoneNumber}: ${demoCode}`)
    } catch (error: any) {
      console.error("SMS sending error:", error)
      throw new Error("Failed to send SMS code. Please try again.")
    }
  }

  // Simulate phone verification
  const simulatePhoneVerification = async (phoneNumber: string, code: string) => {
    try {
      // Validate phone number is allowed
      const allowedPhones = Object.values(ALLOWED_USERS).map((u) => u.phone)
      if (!allowedPhones.includes(phoneNumber)) {
        throw new Error("This phone number is not authorized.")
      }

      // Check if code matches the demo code
      const expectedCode = DEMO_SMS_CODES[phoneNumber as keyof typeof DEMO_SMS_CODES]
      if (code !== expectedCode) {
        throw new Error("Invalid verification code.")
      }

      // Simulate verification delay
      await new Promise((resolve) => setTimeout(resolve, 1000))

      setIsPhoneVerified(true)

      // Store verification status
      localStorage.setItem("phoneVerified", "true")
      localStorage.setItem("phoneVerifiedTime", Date.now().toString())
      localStorage.setItem("phoneVerifiedNumber", phoneNumber)
    } catch (error: any) {
      throw error
    }
  }

  // Verify SMS code (using simulation)
  const verifySMSCode = async (code: string) => {
    if (!sentToPhone) {
      throw new Error("No SMS verification in progress.")
    }

    try {
      await simulatePhoneVerification(sentToPhone, code)
    } catch (error: any) {
      throw error
    }
  }

  // Sign out
  const signOut = async () => {
    try {
      await firebaseSignOut(auth)
      setUser(null)
      setIsAuthenticated(false)
      setIsPhoneVerified(false)
      setCurrentUserPhone(null)
      setSentCode(null)
      setSentToPhone(null)

      // Clear verification status
      localStorage.removeItem("phoneVerified")
      localStorage.removeItem("phoneVerifiedTime")
      localStorage.removeItem("phoneVerifiedNumber")
    } catch (error) {
      console.error("Sign out error:", error)
    }
  }

  const checkFaceIdAvailability = async () => {
    try {
      const { isWebAuthnSupported, isPlatformAuthenticatorAvailable } = await import("./webauthn")
      const supported = isWebAuthnSupported()
      const available = await isPlatformAuthenticatorAvailable()
      setCanUseFaceId(supported && available)
    } catch (error) {
      setCanUseFaceId(false)
    }
  }

  // Monitor auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setIsAuthenticated(!!user)

      // Check phone verification status
      if (user) {
        const phoneVerified = localStorage.getItem("phoneVerified")
        const phoneVerifiedTime = localStorage.getItem("phoneVerifiedTime")
        const phoneVerifiedNumber = localStorage.getItem("phoneVerifiedNumber")

        // Phone verification expires after 24 hours
        if (phoneVerified && phoneVerifiedTime && phoneVerifiedNumber) {
          const verifiedTime = Number.parseInt(phoneVerifiedTime)
          const now = Date.now()
          const twentyFourHours = 24 * 60 * 60 * 1000

          // Also check if the verified phone matches current user's phone
          const userPhone = getPhoneForEmail(user.email || "")

          if (now - verifiedTime < twentyFourHours && phoneVerifiedNumber === userPhone) {
            setIsPhoneVerified(true)
          } else {
            localStorage.removeItem("phoneVerified")
            localStorage.removeItem("phoneVerifiedTime")
            localStorage.removeItem("phoneVerifiedNumber")
            setIsPhoneVerified(false)
          }
        }
      } else {
        setIsPhoneVerified(false)
      }

      setIsLoading(false)
    })

    return unsubscribe
  }, [])

  useEffect(() => {
    if (user?.email) {
      const credentialId = getCredentialIdForUser(user.email)
      setHasFaceId(!!credentialId)
      checkFaceIdAvailability()
    } else {
      setHasFaceId(false)
      setCanUseFaceId(false)
    }
  }, [user])

  const value = {
    user,
    isAuthenticated,
    isPhoneVerified,
    isLoading,
    signIn,
    signOut,
    sendSMSCode,
    verifySMSCode,
    failedAttempts,
    isLocked,
    lockoutTime,
    currentUserPhone,
    simulatePhoneVerification,
    hasFaceId,
    canUseFaceId,
    checkFaceIdAvailability,
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
