"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { KeyRound, Smartphone, LogOut } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import Image from "next/image"

export default function Verify2FAPage() {
  const [verificationCode, setVerificationCode] = useState("")
  const [selectedPhone, setSelectedPhone] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { verify2FA, isAuthenticated, is2FAVerified, error, signOut, allowedPhoneNumbers, user } = useAuth()
  const router = useRouter()

  // Redirect if not authenticated or already 2FA verified
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    } else if (is2FAVerified) {
      router.push("/")
    }
  }, [isAuthenticated, is2FAVerified, router])

  // Set default phone number if only one is available
  useEffect(() => {
    if (allowedPhoneNumbers.length === 1) {
      setSelectedPhone(allowedPhoneNumbers[0])
    }
  }, [allowedPhoneNumbers])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPhone) {
      return
    }

    setIsSubmitting(true)

    try {
      const success = await verify2FA(verificationCode, selectedPhone)
      if (success) {
        router.push("/")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Format phone number for display
  const formatPhone = (phone: string) => {
    if (phone.length === 10) {
      return `(${phone.slice(0, 3)}) ${phone.slice(3, 6)}-${phone.slice(6)}`
    }
    return phone
  }

  if (!isAuthenticated) {
    return null // Will redirect in useEffect
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-amber-50 p-4">
      <div className="w-full max-w-md">
        <Card className="border-amber-200 shadow-lg">
          <CardHeader className="bg-amber-100 border-b border-amber-200 text-center">
            <div className="flex justify-center mb-4">
              <div className="relative w-24 h-24">
                <Image src="/images/pd-logo.png" alt="Pastry Delights Logo" fill className="object-contain" />
              </div>
            </div>
            <CardTitle className="text-amber-800 text-xl">Two-Factor Authentication</CardTitle>
          </CardHeader>

          <CardContent className="pt-6">
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-800">{error}</div>
            )}

            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="font-medium">Welcome, {user?.email}</span>
                <br />
                Please verify your identity with a 6-digit code sent to your phone.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {allowedPhoneNumbers.length > 1 && (
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-amber-800">
                    Select Phone Number
                  </Label>
                  <Select value={selectedPhone} onValueChange={setSelectedPhone} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select a phone number" />
                    </SelectTrigger>
                    <SelectContent>
                      {allowedPhoneNumbers.map((phone) => (
                        <SelectItem key={phone} value={phone}>
                          <div className="flex items-center">
                            <Smartphone className="w-4 h-4 mr-2" />
                            {formatPhone(phone)}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="code" className="text-amber-800">
                  Verification Code
                </Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <Input
                    id="code"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={verificationCode}
                    onChange={(e) => setVerificationCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                    className="pl-10 text-center text-lg tracking-widest"
                    required
                  />
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Enter the 6-digit code sent to {selectedPhone ? formatPhone(selectedPhone) : "your phone"}
                </p>
              </div>

              <Button
                type="submit"
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                disabled={isSubmitting || !selectedPhone}
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Verifying...
                  </>
                ) : (
                  "Verify & Continue"
                )}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                onClick={signOut}
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center border-t border-amber-200 bg-amber-50 text-xs text-amber-600 py-3">
            Pastry Delights Admin Portal &copy; {new Date().getFullYear()}
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
