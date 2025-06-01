"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ArrowLeft, Shield, Smartphone } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import FaceIdAuth from "@/components/face-id-auth"
import ProtectedRoute from "@/components/protected-route"

export default function SetupFaceIdPage() {
  const { user } = useAuth()
  const router = useRouter()
  const [message, setMessage] = useState("")
  const [messageType, setMessageType] = useState<"success" | "error" | "">("")

  const handleSuccess = () => {
    setMessage("Face ID has been successfully set up for your account!")
    setMessageType("success")
    setTimeout(() => {
      router.push("/")
    }, 2000)
  }

  const handleError = (error: string) => {
    setMessage(error)
    setMessageType("error")
  }

  const handleSkip = () => {
    router.push("/")
  }

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 flex items-center justify-center p-4">
        <div className="w-full max-w-lg space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <Shield className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Enhanced Security</h1>
            <p className="text-gray-600">Set up Face ID for faster and more secure access</p>
          </div>

          {/* Face ID Setup Component */}
          {user && (
            <FaceIdAuth
              userEmail={user.email || ""}
              userName={user.displayName || user.email || ""}
              onSuccess={handleSuccess}
              onError={handleError}
              mode="register"
            />
          )}

          {/* Message Display */}
          {message && (
            <Card
              className={`${
                messageType === "success" ? "bg-green-50/80 border-green-200" : "bg-red-50/80 border-red-200"
              }`}
            >
              <CardContent className="p-4">
                <p className={`text-sm font-medium ${messageType === "success" ? "text-green-800" : "text-red-800"}`}>
                  {message}
                </p>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex gap-3">
            <Button onClick={() => router.back()} variant="outline" className="flex-1">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <Button onClick={handleSkip} variant="outline" className="flex-1">
              Skip for Now
            </Button>
          </div>

          {/* Info Card */}
          <Card className="bg-gradient-to-r from-amber-50/80 to-orange-50/80 border-amber-200/50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Smartphone className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="space-y-2">
                  <h3 className="font-medium text-amber-900">Why Face ID?</h3>
                  <ul className="text-xs text-amber-800 space-y-1">
                    <li>• Faster login without typing passwords</li>
                    <li>• Enhanced security with biometric verification</li>
                    <li>• Your biometric data never leaves your device</li>
                    <li>• Works with Face ID, Touch ID, and Windows Hello</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ProtectedRoute>
  )
}
