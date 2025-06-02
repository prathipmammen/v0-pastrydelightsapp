"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Eye, EyeOff, Lock, User, Coffee, Cookie, Croissant } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()

  // Animation mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push("/")
    }
  }, [isAuthenticated, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!username || !password) {
      setError("Please enter both username and password.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await login(username, password)
      // Redirect will happen automatically via useEffect
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#f9f6f1]">
      {/* Background pattern with pastry elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Large infinity symbol background */}
        <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none">
          <div className="w-[800px] h-[400px] relative">
            <div className="absolute left-0 top-0 w-[400px] h-[400px] border-[30px] border-[#7B5D56]/20 rounded-full"></div>
            <div className="absolute right-0 top-0 w-[400px] h-[400px] border-[30px] border-[#7B5D56]/20 rounded-full"></div>
          </div>
        </div>

        {/* Scattered pastry icons */}
        <div className="absolute top-20 left-10 opacity-10">
          <Croissant className="w-12 h-12 text-[#7B5D56]" />
        </div>
        <div className="absolute top-40 right-20 opacity-10">
          <Cookie className="w-10 h-10 text-[#7B5D56]" />
        </div>
        <div className="absolute bottom-32 left-16 opacity-10">
          <Coffee className="w-10 h-10 text-[#7B5D56]" />
        </div>
        <div className="absolute top-60 left-32 opacity-10">
          <Cookie className="w-8 h-8 text-[#7B5D56]" />
        </div>
        <div className="absolute bottom-20 right-32 opacity-10">
          <Croissant className="w-9 h-9 text-[#7B5D56]" />
        </div>
        <div className="absolute top-32 right-40 opacity-10">
          <Coffee className="w-11 h-11 text-[#7B5D56]" />
        </div>
        <div className="absolute bottom-40 left-40 opacity-10">
          <Cookie className="w-7 h-7 text-[#7B5D56]" />
        </div>
        <div className="absolute top-80 right-16 opacity-10">
          <Coffee className="w-9 h-9 text-[#7B5D56]" />
        </div>
        <div className="absolute bottom-60 right-60 opacity-10">
          <Croissant className="w-10 h-10 text-[#7B5D56]" />
        </div>
      </div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-6">
        {/* Logo and title */}
        <div
          className={`text-center mb-8 transform transition-all duration-1000 ease-out ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
          }`}
        >
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <div className="w-24 h-24 relative">
              <img
                src="/images/pd-logo-transparent.png"
                alt="Pastry Delights Logo"
                className="w-full h-full object-contain"
              />
            </div>
          </div>

          <h1 className="text-4xl font-serif text-[#7B5D56] mb-1">Pastry Delights</h1>
          <p className="text-[#7B5D56]/70 text-sm tracking-widest uppercase font-light">Administrative Portal</p>
        </div>

        {/* Login card */}
        <Card
          className={`bg-white border-0 shadow-lg rounded-lg overflow-hidden w-full max-w-md transform transition-all duration-1000 ease-out ${
            mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
          }`}
        >
          <CardHeader className="text-center pb-4 pt-8 border-b border-gray-100">
            <CardTitle className="text-2xl font-light text-[#7B5D56]">Welcome Back</CardTitle>
            <p className="text-[#7B5D56]/70 text-sm mt-1">Please sign in to continue</p>
          </CardHeader>

          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Username field */}
              <div className="space-y-2">
                <Label htmlFor="username" className="text-[#7B5D56] text-sm font-medium flex items-center gap-2">
                  <User className="w-4 h-4 text-[#7B5D56]" />
                  Username
                </Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter your username"
                  className="bg-white border-gray-200 text-[#7B5D56] placeholder:text-gray-400 focus:border-[#7B5D56] focus:ring-1 focus:ring-[#7B5D56]/30 rounded-md h-11"
                  disabled={isLoading}
                  autoComplete="username"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-[#7B5D56] text-sm font-medium flex items-center gap-2">
                  <Lock className="w-4 h-4 text-[#7B5D56]" />
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="bg-white border-gray-200 text-[#7B5D56] placeholder:text-gray-400 focus:border-[#7B5D56] focus:ring-1 focus:ring-[#7B5D56]/30 rounded-md h-11 pr-10"
                    disabled={isLoading}
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-[#7B5D56] transition-colors duration-200"
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div className="bg-red-50 border border-red-100 rounded-md p-3">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                    <span className="text-red-600 text-sm">{error}</span>
                  </div>
                </div>
              )}

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full bg-[#7B5D56] hover:bg-[#6A4C45] text-white font-medium py-2 rounded-md transition-colors duration-300 disabled:opacity-50 disabled:cursor-not-allowed h-11"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Signing In...</span>
                  </div>
                ) : (
                  "Sign In"
                )}
              </Button>

              {/* Session info */}
              <div className="pt-4 border-t border-gray-100 text-center space-y-2">
                <p className="text-green-600 text-xs flex items-center justify-center gap-1">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  Secure connection established
                </p>
                <p className="text-[#7B5D56]/60 text-xs">Session expires after 24 hours</p>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Bottom notice */}
        <div
          className={`text-center mt-8 transform transition-all duration-1000 ease-out delay-300 ${
            mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          <p className="text-[#7B5D56]/60 text-xs">Authorized personnel only • All access is monitored</p>
        </div>
      </div>
    </div>
  )
}
