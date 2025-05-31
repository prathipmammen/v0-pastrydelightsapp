"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/context/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Lock, Mail, Eye, EyeOff, Heart, Coffee, Cookie } from "lucide-react"
import Image from "next/image"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { login, isAuthenticated, is2FAVerified, error, clearError } = useAuth()
  const router = useRouter()

  // Redirect if already authenticated and 2FA verified
  useEffect(() => {
    if (isAuthenticated && is2FAVerified) {
      router.push("/")
    } else if (isAuthenticated && !is2FAVerified) {
      router.push("/verify-2fa")
    }
  }, [isAuthenticated, is2FAVerified, router])

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const success = await login(email, password)
      if (success) {
        router.push("/verify-2fa")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if Firebase API key is valid
  const isFirebaseConfigValid = () => {
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY
    return apiKey && apiKey.startsWith("AIza")
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Beautiful Pastry Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/images/pastry-background.png')",
        }}
      />

      {/* Subtle overlay to ensure readability */}
      <div className="absolute inset-0 bg-white/20 backdrop-blur-[0.5px]" />

      {/* Floating sparkles to add magic */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(12)].map((_, i) => (
          <div
            key={i}
            className="absolute text-amber-600 opacity-40"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              fontSize: `${8 + Math.random() * 6}px`,
              animation: `twinkle ${3 + Math.random() * 4}s ease-in-out infinite`,
              animationDelay: `${Math.random() * 2}s`,
            }}
          >
            ✨
          </div>
        ))}
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          {/* Firebase API Key Warning */}
          {!isFirebaseConfigValid() && (
            <div className="mb-6 p-4 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-2xl flex items-center gap-3 shadow-sm animate-in slide-in-from-top duration-500">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <h3 className="font-semibold text-red-800">Invalid Firebase Configuration</h3>
                <p className="text-sm text-red-700">
                  The Firebase API key is missing or invalid. It should start with "AIza".
                </p>
              </div>
            </div>
          )}

          {/* Main Login Card */}
          <Card className="border-0 shadow-2xl bg-white/95 backdrop-blur-md rounded-3xl overflow-hidden animate-in zoom-in duration-700 relative">
            {/* Warm glow effect matching the background */}
            <div className="absolute inset-0 bg-gradient-to-r from-amber-100/30 via-orange-100/30 to-yellow-100/30 rounded-3xl blur-xl" />

            <div className="relative bg-white/98 backdrop-blur-sm rounded-3xl border border-amber-200/60 shadow-inner">
              <CardHeader className="text-center p-8 relative bg-gradient-to-b from-amber-50/90 to-orange-50/70 rounded-t-3xl border-b border-amber-100/50">
                {/* Header decoration with brown theme */}
                <div className="absolute top-4 left-1/2 transform -translate-x-1/2 flex gap-2">
                  <div className="w-2 h-2 bg-amber-700 rounded-full animate-pulse" />
                  <div
                    className="w-2 h-2 bg-orange-700 rounded-full animate-pulse"
                    style={{ animationDelay: "0.5s" }}
                  />
                  <div className="w-2 h-2 bg-yellow-700 rounded-full animate-pulse" style={{ animationDelay: "1s" }} />
                </div>

                <div className="relative">
                  {/* Logo Container */}
                  <div className="flex justify-center mb-6">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-300/60 to-orange-300/60 rounded-full blur-lg opacity-60 group-hover:opacity-80 transition-opacity duration-300" />
                      <div className="relative w-24 h-24 bg-gradient-to-br from-cream-100 to-amber-100 rounded-full p-4 border-4 border-white shadow-lg">
                        <Image
                          src="/images/pd-logo.png"
                          alt="Pastry Delights Logo"
                          fill
                          className="object-contain p-2"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Title with brown theme */}
                  <CardTitle className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-amber-800 via-orange-700 to-red-700 mb-3">
                    Welcome Back!
                  </CardTitle>

                  {/* Subtitle */}
                  <div className="flex items-center justify-center gap-2 text-amber-800 mb-4">
                    <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                    <span className="text-sm font-medium">Pastry Delights Admin Kitchen</span>
                    <Heart className="w-4 h-4 text-red-500 animate-pulse" />
                  </div>

                  {/* Baking status indicators */}
                  <div className="flex justify-center gap-6 text-xs">
                    <div className="flex items-center gap-1 text-amber-700">
                      <Coffee className="w-3 h-3" />
                      <span>Fresh Brewed</span>
                    </div>
                    <div className="flex items-center gap-1 text-orange-700">
                      <Cookie className="w-3 h-3" />
                      <span>Oven Ready</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-8">
                {error && (
                  <div className="mb-6 p-4 bg-red-50/90 backdrop-blur-sm border border-red-200 rounded-xl text-sm text-red-700 animate-in slide-in-from-top duration-300">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      {error}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Email Field */}
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-amber-900 font-semibold flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      Email Address
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-orange-100/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value)
                          clearError()
                        }}
                        placeholder="your.email@pastrydelights.com"
                        className="relative h-12 bg-gradient-to-r from-cream-50 to-amber-50 border-2 border-amber-300 rounded-xl focus:border-amber-600 focus:ring-4 focus:ring-amber-300/30 transition-all duration-200 text-amber-900 placeholder-amber-600 shadow-inner"
                        required
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-amber-900 font-semibold flex items-center gap-2">
                      <Lock className="w-4 h-4" />
                      Password
                    </Label>
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-r from-amber-100/50 to-orange-100/50 rounded-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-300" />
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => {
                          setPassword(e.target.value)
                          clearError()
                        }}
                        placeholder="Enter your secret recipe"
                        className="relative h-12 bg-gradient-to-r from-cream-50 to-amber-50 border-2 border-amber-300 rounded-xl focus:border-amber-600 focus:ring-4 focus:ring-amber-300/30 transition-all duration-200 text-amber-900 placeholder-amber-600 shadow-inner pr-12"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 transform -translate-y-1/2 text-amber-600 hover:text-amber-800 transition-colors duration-200"
                      >
                        {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    className="w-full h-14 bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-700 hover:via-orange-700 hover:to-red-700 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200 relative overflow-hidden group border-2 border-amber-500"
                    disabled={isSubmitting}
                  >
                    {/* Button sparkle effect */}
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />

                    {/* Button Content */}
                    <div className="relative flex items-center justify-center">
                      {isSubmitting ? (
                        <>
                          <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent mr-3" />
                          <span className="text-lg">Entering Kitchen...</span>
                        </>
                      ) : (
                        <>
                          <Cookie className="w-5 h-5 mr-2" />
                          <span className="text-lg">Enter the Kitchen</span>
                        </>
                      )}
                    </div>
                  </Button>
                </form>

                {/* Footer */}
                <div className="mt-8 text-center">
                  <div className="inline-flex items-center gap-2 text-amber-800 text-sm font-medium">
                    <span className="text-amber-600">🍰</span>
                    <span>Baked with Love since {new Date().getFullYear()}</span>
                    <span className="text-amber-600">🍰</span>
                  </div>
                  <p className="text-xs text-amber-700 mt-2">Where every login is as sweet as our pastries</p>
                </div>
              </CardContent>
            </div>
          </Card>
        </div>
      </div>

      {/* Custom CSS for baking animations */}
      <style jsx>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.1); }
        }
      `}</style>
    </div>
  )
}
