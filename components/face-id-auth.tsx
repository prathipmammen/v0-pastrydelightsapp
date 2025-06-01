"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Smartphone, Shield, CheckCircle, X } from "lucide-react"
import {
  isWebAuthnSupported,
  isPlatformAuthenticatorAvailable,
  generateChallenge,
  stringToUint8Array,
  createCredential,
  getCredential,
  arrayBufferToBase64url,
  base64urlToArrayBuffer,
  storeCredentialInfo,
  getCredentialIdForUser,
  removeStoredCredential,
} from "@/lib/webauthn"

interface FaceIdAuthProps {
  userEmail: string
  userName: string
  onSuccess: () => void
  onError: (error: string) => void
  mode: "register" | "authenticate"
}

export default function FaceIdAuth({ userEmail, userName, onSuccess, onError, mode }: FaceIdAuthProps) {
  const [isSupported, setIsSupported] = useState(false)
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasExistingCredential, setHasExistingCredential] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    checkSupport()
    checkExistingCredential()
  }, [userEmail])

  const checkSupport = async () => {
    const webAuthnSupported = isWebAuthnSupported()
    const platformAvailable = await isPlatformAuthenticatorAvailable()

    setIsSupported(webAuthnSupported)
    setIsPlatformAvailable(platformAvailable)
  }

  const checkExistingCredential = () => {
    const credentialId = getCredentialIdForUser(userEmail)
    setHasExistingCredential(!!credentialId)
  }

  const handleRegister = async () => {
    if (!isSupported || !isPlatformAvailable) {
      onError("Face ID is not supported on this device")
      return
    }

    setIsLoading(true)

    try {
      const challenge = generateChallenge()
      const userId = stringToUint8Array(userEmail)

      const credential = await createCredential({
        challenge,
        rp: {
          name: "Pastry Delights Admin",
          id: window.location.hostname,
        },
        user: {
          id: userId,
          name: userEmail,
          displayName: userName,
        },
        pubKeyCredParams: [
          { alg: -7, type: "public-key" }, // ES256
          { alg: -257, type: "public-key" }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          requireResidentKey: false,
        },
        timeout: 60000,
        attestation: "none",
      })

      // Store credential ID (in production, send to server)
      const credentialId = arrayBufferToBase64url(credential.rawId)
      storeCredentialInfo(credentialId, userEmail)

      setHasExistingCredential(true)
      onSuccess()
    } catch (error: any) {
      console.error("Face ID registration error:", error)
      if (error.name === "NotAllowedError") {
        onError("Face ID registration was cancelled or not allowed")
      } else if (error.name === "InvalidStateError") {
        onError("Face ID is already registered for this account")
      } else {
        onError("Failed to register Face ID. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuthenticate = async () => {
    if (!isSupported || !isPlatformAvailable) {
      onError("Face ID is not supported on this device")
      return
    }

    const credentialId = getCredentialIdForUser(userEmail)
    if (!credentialId) {
      onError("No Face ID registered for this account")
      return
    }

    setIsLoading(true)

    try {
      const challenge = generateChallenge()
      const allowCredentials = [
        {
          id: base64urlToArrayBuffer(credentialId),
          type: "public-key" as const,
        },
      ]

      const credential = await getCredential(challenge, allowCredentials)

      // In production, verify the credential on the server
      onSuccess()
    } catch (error: any) {
      console.error("Face ID authentication error:", error)
      if (error.name === "NotAllowedError") {
        onError("Face ID authentication was cancelled or failed")
      } else if (error.name === "InvalidStateError") {
        onError("Face ID authentication failed. Please try again.")
      } else {
        onError("Face ID authentication failed. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleRemoveCredential = () => {
    removeStoredCredential(userEmail)
    setHasExistingCredential(false)
  }

  if (!mounted) {
    return null
  }

  if (!isSupported) {
    return (
      <Card className="w-full max-w-md bg-red-50/80 border-red-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-red-700">
            <X className="w-4 h-4" />
            <span className="text-sm font-medium">Face ID not supported on this browser</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!isPlatformAvailable) {
    return (
      <Card className="w-full max-w-md bg-yellow-50/80 border-yellow-200">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 text-yellow-700">
            <AlertCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Face ID not available on this device</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md bg-gradient-to-br from-blue-50/80 to-indigo-50/80 border-blue-200/50 backdrop-blur-sm">
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-3">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
            <Smartphone className="w-6 h-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-lg font-bold text-blue-900">
          {mode === "register" ? "Setup Face ID" : "Face ID Authentication"}
        </CardTitle>
        <p className="text-sm text-blue-700">
          {mode === "register"
            ? "Secure your account with biometric authentication"
            : "Use Face ID to verify your identity"}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {mode === "register" && (
          <>
            {hasExistingCredential ? (
              <div className="bg-green-50/80 border border-green-200 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">Face ID Already Registered</span>
                </div>
                <p className="text-xs text-green-700 mb-3">Face ID is already set up for your account.</p>
                <Button
                  onClick={handleRemoveCredential}
                  variant="outline"
                  size="sm"
                  className="w-full text-red-600 border-red-200 hover:bg-red-50"
                >
                  Remove Face ID
                </Button>
              </div>
            ) : (
              <>
                <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-4 h-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Enhanced Security</span>
                  </div>
                  <p className="text-xs text-blue-700">
                    Face ID adds an extra layer of security to your admin account.
                  </p>
                </div>

                <Button
                  onClick={handleRegister}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                >
                  {isLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Setting up Face ID...
                    </>
                  ) : (
                    <>
                      <Smartphone className="w-4 h-4 mr-2" />
                      Setup Face ID
                    </>
                  )}
                </Button>
              </>
            )}
          </>
        )}

        {mode === "authenticate" && (
          <>
            <div className="bg-blue-50/80 border border-blue-200 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-4 h-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">Biometric Verification</span>
              </div>
              <p className="text-xs text-blue-700">Please use Face ID to complete your authentication.</p>
            </div>

            <Button
              onClick={handleAuthenticate}
              disabled={isLoading || !hasExistingCredential}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium py-3 rounded-lg shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Authenticating...
                </>
              ) : (
                <>
                  <Smartphone className="w-4 h-4 mr-2" />
                  Use Face ID
                </>
              )}
            </Button>

            {!hasExistingCredential && (
              <p className="text-xs text-gray-600 text-center">
                Face ID not registered for this account. Please set it up first.
              </p>
            )}
          </>
        )}

        <div className="text-xs text-gray-500 text-center space-y-1">
          <p>🔒 Your biometric data never leaves your device</p>
          <p>✨ Works with Face ID, Touch ID, and Windows Hello</p>
        </div>
      </CardContent>
    </Card>
  )
}
