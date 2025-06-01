"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Phone, Shield, Smartphone, ScanFaceIcon as FaceId, ArrowLeft, Info } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

const PHONE_OPTIONS = [
  { number: "6309033154", name: "Prathip", formatted: "(630) 903-3154", demoCode: "123456" },
  { number: "9728046540", name: "Dinu", formatted: "(972) 804-6540", demoCode: "654321" },
]

export default function VerifyPhonePage() {
  const [step, setStep] = useState<"select" | "verify">("select")
  const [selectedPhone, setSelectedPhone] = useState("")
  const [verificationCode, setVerificationCode] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [codeSent, setCodeSent] = useState(false)
  const [showDemoInfo, setShowDemoInfo] = useState(false)

  const { isAuthenticated, isPhoneVerified, sendSMSCode, verifySMSCode, signOut, currentUserPhone } = useAuth()
  const router = useRouter()

  // Redirect logic
  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/login")
    } else if (isPhoneVerified) {
      router.push("/")
    }
  }, [isAuthenticated, isPhoneVerified, router])

  // Auto-select phone if we know the user's phone
  useEffect(() => {
    if (currentUserPhone) {
      setSelectedPhone(currentUserPhone)
    }
  }, [currentUserPhone])

  const handleSendCode = async () => {
    if (!selectedPhone) {
      setError("Please select a phone number.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await sendSMSCode(selectedPhone)
      setCodeSent(true)
      setStep("verify")
      setShowDemoInfo(true)
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      setError("Please enter a valid 6-digit code.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await verifySMSCode(verificationCode)
      // Redirect will happen automatically via useEffect
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push("/login")
  }

  const handleBackToSelect = () => {
    setStep("select")
    setVerificationCode("")
    setError("")
    setCodeSent(false)
    setShowDemoInfo(false)
  }

  const selectedPhoneOption = PHONE_OPTIONS.find((p) => p.number === selectedPhone)

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        backgroundImage: "url('/images/pastry-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <Card className="w-full max-w-md bg-amber-50/95 backdrop-blur-sm border-amber-200 shadow-xl">
        <CardHeader className="text-center bg-amber-100/95 border-b border-amber-200">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 relative">
              <Image
                src="/images/pd-logo.png"
                alt="P&D Pastry Delights Logo"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <CardTitle className="text-xl font-bold text-amber-800">Two-Factor Authentication</CardTitle>
          <p className="text-amber-700 text-sm">
            {step === "select" ? "Select your phone number" : "Enter verification code"}
          </p>
        </CardHeader>

        <CardContent className="p-6 space-y-6">
          {/* Demo Mode Notice */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Info className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-800">Demo Mode</span>
            </div>
            <p className="text-xs text-blue-700">
              SMS verification is simulated for demo purposes. Use the provided codes below.
            </p>
          </div>

          {step === "select" && (
            <div className="space-y-4">
              <div>
                <Label className="text-amber-800 flex items-center gap-2 mb-3">
                  <Phone className="w-4 h-4" />
                  Select Your Phone Number
                </Label>

                <div className="space-y-3">
                  {PHONE_OPTIONS.map((option) => (
                    <label
                      key={option.number}
                      className={`flex items-center p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedPhone === option.number
                          ? "border-amber-500 bg-amber-50"
                          : "border-amber-300 hover:border-amber-400 hover:bg-amber-25"
                      }`}
                    >
                      <input
                        type="radio"
                        name="phone"
                        value={option.number}
                        checked={selectedPhone === option.number}
                        onChange={(e) => setSelectedPhone(e.target.value)}
                        className="sr-only"
                      />
                      <div
                        className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                          selectedPhone === option.number ? "border-amber-500 bg-amber-500" : "border-amber-300"
                        }`}
                      >
                        {selectedPhone === option.number && <div className="w-2 h-2 rounded-full bg-white"></div>}
                      </div>
                      <div className="flex-1">
                        <div className="font-medium text-amber-800">{option.name}</div>
                        <div className="text-sm text-amber-600">{option.formatted}</div>
                        <div className="text-xs text-blue-600 font-mono">Demo Code: {option.demoCode}</div>
                      </div>
                      <Smartphone className="w-4 h-4 text-amber-600" />
                    </label>
                  ))}
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                </div>
              )}

              <Button
                onClick={handleSendCode}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2"
                disabled={!selectedPhone || isLoading}
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Code...
                  </>
                ) : (
                  "Send Verification Code"
                )}
              </Button>
            </div>
          )}

          {step === "verify" && (
            <div className="space-y-4">
              <div className="text-center">
                <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Phone className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Code Sent!</span>
                  </div>
                  <p className="text-xs text-green-700">Verification code sent to {selectedPhoneOption?.formatted}</p>
                </div>
              </div>

              {/* Demo Code Display */}
              {showDemoInfo && selectedPhoneOption && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="w-4 h-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Demo Code</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    Use this code: <span className="font-mono font-bold text-lg">{selectedPhoneOption.demoCode}</span>
                  </p>
                </div>
              )}

              <div>
                <Label htmlFor="code" className="text-amber-800 flex items-center gap-2">
                  <Shield className="w-4 h-4" />
                  6-Digit Verification Code
                </Label>
                <Input
                  id="code"
                  type="text"
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="000000"
                  className="mt-1 border-amber-300 focus:border-amber-500 text-center text-lg font-mono tracking-widest"
                  disabled={isLoading}
                  maxLength={6}
                  autoComplete="one-time-code"
                />
                <p className="text-xs text-amber-600 mt-1">Enter the 6-digit code from above</p>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span className="text-sm text-red-800">{error}</span>
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <Button
                  onClick={handleVerifyCode}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2"
                  disabled={verificationCode.length !== 6 || isLoading}
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Verifying...
                    </>
                  ) : (
                    "Verify Code"
                  )}
                </Button>

                <Button
                  onClick={handleBackToSelect}
                  variant="outline"
                  className="w-full border-amber-300 text-amber-700 hover:bg-amber-50"
                  disabled={isLoading}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Phone Selection
                </Button>
              </div>
            </div>
          )}

          {/* Coming Soon: Face ID */}
          <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <FaceId className="w-4 h-4 text-purple-600" />
              <span className="text-sm font-medium text-purple-800">Coming Soon</span>
            </div>
            <p className="text-xs text-purple-700">
              Face ID authentication will be available in a future update for even faster access.
            </p>
          </div>

          {/* Sign Out Option */}
          <div className="pt-4 border-t border-amber-200">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full border-amber-300 text-amber-700 hover:bg-amber-50 text-sm"
            >
              Sign Out & Return to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
