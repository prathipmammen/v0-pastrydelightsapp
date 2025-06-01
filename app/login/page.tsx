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
  const { signIn, isAuthenticated, failedAttempts, isLocked, lockoutTime } = useAuth()
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

  // Format lockout time
  const formatLockoutTime = (time: number) => {
    const remaining = Math.ceil((time - Date.now()) / 1000)
    const minutes = Math.floor(remaining / 60)
    const seconds = remaining % 60
    return `${minutes}:${seconds.toString().padStart(2, "0")}`
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (isLocked) {
      setError("Account is temporarily locked. Please wait before trying again.")
      return
    }

    if (!username || !password) {
      setError("Please enter both username and password.")
      return
    }

    setIsLoading(true)
    setError("")

    try {
      await signIn(username, password)
      // Redirect will happen automatically via useEffect
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50">
      {/* Hand-drawn pastry illustrations floating around */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Croissants */}
        <div className="absolute top-20 left-10 animate-float-slow opacity-30">
          <Croissant className="w-12 h-12 text-amber-600 transform rotate-12" />
        </div>
        <div className="absolute top-40 right-20 animate-float-slower opacity-25">
          <Croissant className="w-8 h-8 text-orange-600 transform -rotate-45" />
        </div>
        <div className="absolute bottom-32 left-16 animate-float opacity-20">
          <Croissant className="w-10 h-10 text-amber-700 transform rotate-90" />
        </div>

        {/* Coffee cups */}
        <div className="absolute top-60 left-32 animate-float-slow opacity-25">
          <Coffee className="w-10 h-10 text-amber-800 transform -rotate-12" />
        </div>
        <div className="absolute bottom-20 right-32 animate-float-slower opacity-30">
          <Coffee className="w-8 h-8 text-orange-700" />
        </div>

        {/* Cookies */}
        <div className="absolute top-32 right-40 animate-float opacity-20">
          <Cookie className="w-9 h-9 text-amber-600 transform rotate-45" />
        </div>
        <div className="absolute bottom-40 left-40 animate-float-slow opacity-25">
          <Cookie className="w-7 h-7 text-orange-600 transform -rotate-30" />
        </div>
        <div className="absolute top-80 right-16 animate-float-slower opacity-20">
          <Cookie className="w-11 h-11 text-amber-700 transform rotate-180" />
        </div>

        {/* Additional scattered elements */}
        <div className="absolute top-16 right-60 animate-float opacity-15">
          <div className="w-3 h-3 bg-amber-400 rounded-full"></div>
        </div>
        <div className="absolute bottom-60 left-60 animate-float-slow opacity-20">
          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
        </div>
        <div className="absolute top-96 left-20 animate-float-slower opacity-15">
          <div className="w-4 h-4 bg-amber-500 rounded-full"></div>
        </div>
      </div>

      {/* Main Content with Infinity Symbol Design */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="relative">
          {/* Large Infinity Symbol Background */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="relative w-96 h-48">
              {/* Left circle of infinity */}
              <div className="absolute left-0 top-0 w-48 h-48 border-8 border-amber-800/30 rounded-full animate-pulse-slow"></div>
              {/* Right circle of infinity */}
              <div
                className="absolute right-0 top-0 w-48 h-48 border-8 border-amber-800/30 rounded-full animate-pulse-slow"
                style={{ animationDelay: "1s" }}
              ></div>
              {/* Center overlap */}
              <div className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 w-24 h-24 bg-amber-800/10 rounded-full animate-pulse"></div>
            </div>
          </div>

          {/* Login Card positioned in center of infinity */}
          <div
            className={`relative z-20 transform transition-all duration-1500 ease-out ${
              mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
            }`}
          >
            <Card className="w-full max-w-sm bg-white/95 backdrop-blur-xl border-0 shadow-2xl hover:shadow-3xl transition-all duration-700 hover:scale-[1.03] rounded-2xl overflow-hidden">
              <CardHeader className="text-center bg-gradient-to-br from-amber-100/95 via-orange-100/95 to-yellow-100/95 border-b border-amber-200/50 relative overflow-hidden">
                {/* Decorative elements in header */}
                <div className="absolute top-2 left-2 w-2 h-2 bg-amber-400/50 rounded-full animate-ping"></div>
                <div
                  className="absolute top-4 right-4 w-1 h-1 bg-orange-400/50 rounded-full animate-ping"
                  style={{ animationDelay: "0.5s" }}
                ></div>
                <div
                  className="absolute bottom-2 left-4 w-1.5 h-1.5 bg-yellow-400/50 rounded-full animate-ping"
                  style={{ animationDelay: "1s" }}
                ></div>

                <div className="flex justify-center mb-4 relative">
                  <div className="w-16 h-16 relative group">
                    <div className="absolute inset-0 bg-gradient-to-r from-amber-400 via-orange-400 to-yellow-400 rounded-full opacity-20 group-hover:opacity-40 transition-all duration-500 animate-pulse-slow"></div>
                    <div className="absolute inset-2 bg-white rounded-full shadow-inner"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="text-2xl font-bold text-amber-800 group-hover:scale-110 transition-transform duration-300">
                        ∞
                      </div>
                    </div>
                  </div>
                </div>

                <CardTitle className="text-xl font-bold bg-gradient-to-r from-amber-800 via-orange-800 to-amber-900 bg-clip-text text-transparent animate-fade-in tracking-wide">
                  P&D Pastry Delights
                </CardTitle>
                <p className="text-amber-700 text-xs font-medium animate-fade-in-delay tracking-widest uppercase">
                  Admin Access Portal
                </p>
              </CardHeader>

              <CardContent className="p-6 space-y-5 relative">
                {/* Demo Credentials Notice */}
                <div className="bg-gradient-to-r from-blue-50/80 to-indigo-50/80 border border-blue-200/30 rounded-xl p-3 transform hover:scale-[1.02] transition-all duration-300 animate-slide-in backdrop-blur-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <User className="w-3 h-3 text-blue-600 animate-pulse" />
                    <span className="text-xs font-semibold text-blue-800 tracking-wide">DEMO CREDENTIALS</span>
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Username: <span className="font-mono font-semibold">dinudixon</span>
                    <br />
                    Password: <span className="font-mono font-semibold">Boost#1992</span>
                  </p>
                </div>

                {/* Failed Attempts Warning */}
                {failedAttempts > 0 && !isLocked && (
                  <div className="bg-gradient-to-r from-yellow-50/80 to-orange-50/80 border border-yellow-200/30 rounded-xl p-3 animate-shake backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-yellow-600 animate-bounce" />
                      <span className="text-xs text-yellow-800 font-medium">
                        {failedAttempts} failed attempt{failedAttempts > 1 ? "s" : ""}. {5 - failedAttempts} remaining.
                      </span>
                    </div>
                  </div>
                )}

                {/* Lockout Warning */}
                {isLocked && lockoutTime && (
                  <div className="bg-gradient-to-r from-red-50/80 to-pink-50/80 border border-red-200/30 rounded-xl p-3 animate-pulse backdrop-blur-sm">
                    <div className="flex items-center gap-2">
                      <Lock className="w-3 h-3 text-red-600" />
                      <span className="text-xs text-red-800 font-medium">
                        Account locked. Try again in {formatLockoutTime(lockoutTime)}
                      </span>
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="group">
                    <Label
                      htmlFor="username"
                      className="text-amber-800 flex items-center gap-2 font-semibold text-xs tracking-wide uppercase"
                    >
                      <User className="w-3 h-3 group-hover:text-amber-600 transition-colors duration-200" />
                      Username
                    </Label>
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="mt-2 border-amber-300/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 transition-all duration-300 hover:border-amber-400 bg-white/90 backdrop-blur-sm rounded-xl h-11 text-sm"
                      disabled={isLocked || isLoading}
                      autoComplete="username"
                    />
                  </div>

                  <div className="group">
                    <Label
                      htmlFor="password"
                      className="text-amber-800 flex items-center gap-2 font-semibold text-xs tracking-wide uppercase"
                    >
                      <Lock className="w-3 h-3 group-hover:text-amber-600 transition-colors duration-200" />
                      Password
                    </Label>
                    <div className="relative mt-2">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password"
                        className="border-amber-300/40 focus:border-amber-500 focus:ring-2 focus:ring-amber-200/50 pr-10 transition-all duration-300 hover:border-amber-400 bg-white/90 backdrop-blur-sm rounded-xl h-11 text-sm"
                        disabled={isLocked || isLoading}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 transform -translate-y-1/2 text-amber-600 hover:text-amber-800 transition-all duration-200 hover:scale-110"
                        disabled={isLocked || isLoading}
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && (
                    <div className="bg-gradient-to-r from-red-50/80 to-pink-50/80 border border-red-200/30 rounded-xl p-3 animate-shake backdrop-blur-sm">
                      <div className="flex items-center gap-2">
                        <AlertCircle className="w-3 h-3 text-red-600 animate-bounce" />
                        <span className="text-xs text-red-800 font-medium">{error}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    type="submit"
                    className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-700 hover:via-orange-700 hover:to-amber-800 text-white font-bold py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none text-sm tracking-wide uppercase group"
                    disabled={isLocked || isLoading}
                  >
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Signing In...
                      </>
                    ) : (
                      <>
                        <span>Sign In</span>
                        <div className="ml-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 transform group-hover:translate-x-1">
                          →
                        </div>
                      </>
                    )}
                  </Button>
                </form>

                {/* Session Info */}
                <div className="bg-gradient-to-r from-amber-100/60 to-orange-100/60 border border-amber-300/30 rounded-xl p-3 hover:bg-gradient-to-r hover:from-amber-100/80 hover:to-orange-100/80 transition-all duration-300 backdrop-blur-sm">
                  <p className="text-xs text-amber-800 text-center font-semibold tracking-wide">
                    🔒 Session expires after 24 hours
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Bottom Text */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-none">
        <h1 className="text-4xl md:text-6xl font-light text-amber-800/40 tracking-[0.3em] uppercase animate-fade-in-slow">
          Pastry Delights
        </h1>
      </div>

      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-15px) rotate(5deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(10deg); }
        }
        
        @keyframes float-slower {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-25px) rotate(-8deg); }
        }
        
        @keyframes pulse-slow {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.05); }
        }
        
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-delay {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes fade-in-slow {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        @keyframes slide-in {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-3px); }
          75% { transform: translateX(3px); }
        }
        
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 6s ease-in-out infinite;
        }
        
        .animate-float-slower {
          animation: float-slower 8s ease-in-out infinite;
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-fade-in {
          animation: fade-in 0.8s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in-delay 0.8s ease-out 0.3s both;
        }
        
        .animate-fade-in-slow {
          animation: fade-in-slow 2s ease-out 1s both;
        }
        
        .animate-slide-in {
          animation: slide-in 0.6s ease-out 0.5s both;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .shadow-3xl {
          box-shadow: 0 35px 60px -12px rgba(0, 0, 0, 0.25);
        }
      `}</style>
    </div>
  )
}
