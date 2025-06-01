"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertCircle, Eye, EyeOff, Lock, User, Sparkles, Croissant, Coffee, Cookie } from "lucide-react"
import { useAuth } from "@/lib/auth-context"

export default function LoginPage() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })
  const { login, isAuthenticated } = useAuth()
  const router = useRouter()
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [pastryElements, setPastryElements] = useState<
    Array<{
      id: number
      x: number
      y: number
      rotation: number
      scale: number
      opacity: number
      delay: number
      type: string
    }>
  >([])
  const [particles, setParticles] = useState<
    Array<{
      id: number
      x: number
      y: number
      size: number
      speed: number
      opacity: number
      color: string
    }>
  >([])

  // Initialize pastry elements and particles
  useEffect(() => {
    // Pastry elements
    const elements = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360,
      scale: 0.5 + Math.random() * 0.5,
      opacity: 0.2 + Math.random() * 0.3,
      delay: Math.random() * 5,
      type: ["croissant", "coffee", "cookie", "sparkle"][Math.floor(Math.random() * 4)],
    }))
    setPastryElements(elements)

    // Flour particles
    const particlesArray = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: 1 + Math.random() * 3,
      speed: 0.2 + Math.random() * 0.8,
      opacity: 0.1 + Math.random() * 0.4,
      color: ["#D2C4B5", "#E8E1D9", "#F5F0EA"][Math.floor(Math.random() * 3)],
    }))
    setParticles(particlesArray)
  }, [])

  // Animation mount effect
  useEffect(() => {
    setMounted(true)
  }, [])

  // Mouse tracking
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        setMousePosition({
          x: ((e.clientX - rect.left) / rect.width) * 100,
          y: ((e.clientY - rect.top) / rect.height) * 100,
        })
      }
    }
    window.addEventListener("mousemove", handleMouseMove)
    return () => window.removeEventListener("mousemove", handleMouseMove)
  }, [])

  // Canvas animation for flour particles
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    // Set canvas dimensions
    const setCanvasDimensions = () => {
      if (canvas && containerRef.current) {
        canvas.width = containerRef.current.offsetWidth
        canvas.height = containerRef.current.offsetHeight
      }
    }
    setCanvasDimensions()
    window.addEventListener("resize", setCanvasDimensions)

    // Animation loop
    let animationFrameId: number
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Draw particles
      particles.forEach((particle, index) => {
        ctx.beginPath()
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2)
        ctx.fillStyle = `${particle.color}${Math.floor(particle.opacity * 255)
          .toString(16)
          .padStart(2, "0")}`
        ctx.fill()

        // Update particle position
        particles[index].y -= particle.speed
        particles[index].x += Math.sin(particle.y * 0.01) * 0.5

        // Reset particle if it goes off screen
        if (particles[index].y < -10) {
          particles[index].y = canvas.height + 10
          particles[index].x = Math.random() * canvas.width
        }
      })

      animationFrameId = requestAnimationFrame(animate)
    }

    animate()

    return () => {
      window.removeEventListener("resize", setCanvasDimensions)
      cancelAnimationFrame(animationFrameId)
    }
  }, [particles])

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
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Render pastry icon based on type
  const PastryIcon = ({ type }: { type: string }) => {
    switch (type) {
      case "croissant":
        return <Croissant className="w-full h-full text-[#D2C4B5]" />
      case "coffee":
        return <Coffee className="w-full h-full text-[#D2C4B5]" />
      case "cookie":
        return <Cookie className="w-full h-full text-[#D2C4B5]" />
      case "sparkle":
        return <Sparkles className="w-full h-full text-[#D2C4B5]" />
      default:
        return <Sparkles className="w-full h-full text-[#D2C4B5]" />
    }
  }

  // Color palette based on the image
  const colors = {
    brown: "#7B5D56", // Rich brown from the infinity symbol
    tan: "#D2C4B5", // Light tan from the pastry sketches
    lightTan: "#E8E1D9", // Even lighter tan for subtle elements
    white: "#FFFFFF", // White background
  }

  return (
    <div ref={containerRef} className="min-h-screen relative overflow-hidden bg-white">
      {/* Canvas for flour particles */}
      <canvas ref={canvasRef} className="absolute inset-0 z-0 pointer-events-none" />

      {/* Background pattern with animated pastry elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Static pattern background */}
        <div className="absolute inset-0 opacity-[0.07]">
          <Image src="/images/pastry-pattern.png" alt="Pastry pattern" fill style={{ objectFit: "cover" }} />
        </div>

        {/* Animated pastry elements */}
        {pastryElements.map((pastry) => (
          <div
            key={pastry.id}
            className="absolute"
            style={{
              left: `${pastry.x}%`,
              top: `${pastry.y}%`,
              transform: `rotate(${pastry.rotation}deg) scale(${pastry.scale})`,
              opacity: pastry.opacity,
              animation: `float-pastry 15s infinite ease-in-out ${pastry.delay}s`,
              width: "40px",
              height: "40px",
            }}
          >
            <PastryIcon type={pastry.type} />
          </div>
        ))}

        {/* Hand-drawn whisk animation */}
        <div className="absolute top-10 right-10 w-32 h-32 opacity-20 animate-float-whisk">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#7B5D56]">
            <path
              d="M30,70 C30,50 40,30 60,20 C70,15 80,20 75,30 C70,40 60,45 50,50 C40,55 30,60 30,70 Z"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              className="animate-draw-path"
            />
            <path
              d="M35,65 C35,50 45,35 60,25"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              className="animate-draw-path animation-delay-500"
            />
            <path
              d="M40,60 C40,50 50,40 60,30"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              strokeLinecap="round"
              className="animate-draw-path animation-delay-1000"
            />
          </svg>
        </div>

        {/* Additional hand-drawn elements */}
        <div className="absolute bottom-20 left-10 w-24 h-24 opacity-20 animate-float-slow">
          <svg viewBox="0 0 100 100" className="w-full h-full text-[#7B5D56]">
            <circle
              cx="50"
              cy="50"
              r="30"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              className="animate-draw-circle"
            />
            <circle
              cx="50"
              cy="50"
              r="20"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              className="animate-draw-circle animation-delay-500"
            />
            <circle
              cx="50"
              cy="50"
              r="10"
              stroke="currentColor"
              strokeWidth="1"
              fill="none"
              className="animate-draw-circle animation-delay-1000"
            />
          </svg>
        </div>
      </div>

      {/* Subtle gradient overlay that follows mouse */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${mousePosition.x}% ${mousePosition.y}%, ${colors.brown}40 0%, transparent 60%)`,
          transition: "background 0.3s ease-out",
        }}
      ></div>

      {/* Main content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Logo section */}
          <div
            className={`text-center mb-12 transform transition-all duration-1500 ease-out ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-8 opacity-0"
            }`}
          >
            {/* Logo */}
            <div className="inline-flex items-center justify-center mb-6 relative">
              <div className="w-40 h-40 relative">
                <Image
                  src="/images/pd-logo-infinity.png"
                  alt="Pastry Delights Logo"
                  width={160}
                  height={160}
                  className="animate-float-gentle"
                />

                {/* Animated rings around logo */}
                <div className="absolute inset-0 rounded-full border border-[#7B5D56]/20 animate-expand-ring"></div>
                <div className="absolute inset-2 rounded-full border border-[#7B5D56]/15 animate-expand-ring animation-delay-500"></div>
                <div className="absolute inset-4 rounded-full border border-[#7B5D56]/10 animate-expand-ring animation-delay-1000"></div>
              </div>
            </div>

            <h1 className="text-4xl font-light text-[#7B5D56] mb-2 tracking-wider">Pastry Delights</h1>
            <p className="text-[#7B5D56]/70 text-sm tracking-widest uppercase font-medium">Administrative Portal</p>
          </div>

          {/* Login card */}
          <Card
            className={`bg-white border border-[#D2C4B5]/50 shadow-xl rounded-2xl overflow-hidden transform transition-all duration-1500 ease-out ${
              mounted ? "translate-y-0 opacity-100 scale-100" : "translate-y-12 opacity-0 scale-95"
            }`}
          >
            <CardHeader className="text-center pb-6 pt-8 relative border-b border-[#E8E1D9]">
              <CardTitle className="text-2xl font-light text-[#7B5D56] relative z-10">Welcome Back</CardTitle>
              <p className="text-[#7B5D56]/70 text-sm relative z-10">Please sign in to continue</p>
            </CardHeader>

            <CardContent className="px-8 py-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Username field */}
                <div className="space-y-2">
                  <Label htmlFor="username" className="text-[#7B5D56] text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-[#7B5D56]" />
                    Username
                  </Label>
                  <div className="relative group">
                    <Input
                      id="username"
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username"
                      className="bg-white border-[#D2C4B5] text-[#7B5D56] placeholder:text-[#D2C4B5] focus:border-[#7B5D56] focus:ring-2 focus:ring-[#D2C4B5]/30 rounded-xl h-12 transition-all duration-300"
                      disabled={isLoading}
                      autoComplete="username"
                    />
                    <div className="absolute inset-0 rounded-xl border border-[#7B5D56]/0 group-hover:border-[#7B5D56]/20 pointer-events-none transition-all duration-300"></div>
                  </div>
                </div>

                {/* Password field */}
                <div className="space-y-2">
                  <Label htmlFor="password" className="text-[#7B5D56] text-sm font-medium flex items-center gap-2">
                    <Lock className="w-4 h-4 text-[#7B5D56]" />
                    Password
                  </Label>
                  <div className="relative group">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="bg-white border-[#D2C4B5] text-[#7B5D56] placeholder:text-[#D2C4B5] focus:border-[#7B5D56] focus:ring-2 focus:ring-[#D2C4B5]/30 rounded-xl h-12 pr-12 transition-all duration-300"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-[#7B5D56]/70 hover:text-[#7B5D56] transition-colors duration-200 p-1"
                      disabled={isLoading}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                    <div className="absolute inset-0 rounded-xl border border-[#7B5D56]/0 group-hover:border-[#7B5D56]/20 pointer-events-none transition-all duration-300"></div>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 animate-shake">
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <span className="text-red-600 text-sm">{error}</span>
                    </div>
                  </div>
                )}

                {/* Submit button */}
                <Button
                  type="submit"
                  className="w-full bg-[#7B5D56] hover:bg-[#6A4C45] text-white font-medium py-3 rounded-xl shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none relative overflow-hidden group"
                  disabled={isLoading}
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                  <span className="relative z-10 flex items-center justify-center gap-2">
                    {isLoading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Signing In...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </span>
                </Button>
              </form>

              {/* Footer info */}
              <div className="mt-8 pt-6 border-t border-[#E8E1D9]">
                <div className="text-center space-y-3">
                  <p className="text-[#7B5D56]/70 text-xs flex items-center justify-center gap-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                    Secure connection established
                  </p>
                  <p className="text-[#7B5D56]/70 text-xs">Session expires after 24 hours</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bottom notice */}
          <div
            className={`text-center mt-8 transform transition-all duration-1500 ease-out delay-300 ${
              mounted ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
            }`}
          >
            <p className="text-[#7B5D56]/60 text-xs">Authorized personnel only • All access is monitored</p>
          </div>
        </div>
      </div>

      {/* Animated infinity symbol at the bottom */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 opacity-10 pointer-events-none">
        <svg viewBox="0 0 100 50" className="w-40 h-40 text-[#7B5D56]">
          <path
            d="M25,25 C25,15 35,15 40,25 C45,35 55,35 55,25 C55,15 65,15 70,25 C75,35 85,35 85,25"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className="animate-draw-path"
          />
          <path
            d="M85,25 C85,35 75,35 70,25 C65,15 55,15 55,25 C55,35 45,35 40,25 C35,15 25,15 25,25"
            stroke="currentColor"
            strokeWidth="4"
            fill="none"
            strokeLinecap="round"
            className="animate-draw-path animation-delay-1000"
          />
        </svg>
      </div>

      <style jsx>{`
        @keyframes float-pastry {
          0%, 100% { transform: translate(0, 0) rotate(var(--rotation)); }
          25% { transform: translate(20px, -15px) rotate(calc(var(--rotation) + 5deg)); }
          50% { transform: translate(-10px, -25px) rotate(calc(var(--rotation) - 3deg)); }
          75% { transform: translate(-15px, 10px) rotate(calc(var(--rotation) + 2deg)); }
        }
        
        @keyframes float-whisk {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          33% { transform: translate(-15px, 10px) rotate(-5deg); }
          66% { transform: translate(10px, 15px) rotate(5deg); }
        }
        
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) rotate(0deg); }
          50% { transform: translate(15px, -15px) rotate(5deg); }
        }
        
        @keyframes float-gentle {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        
        @keyframes pulse-subtle {
          0%, 100% { opacity: 0.9; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.03); }
        }
        
        @keyframes expand-ring {
          0% { transform: scale(0.8); opacity: 0.6; }
          50% { opacity: 0.3; }
          100% { transform: scale(1.2); opacity: 0; }
        }
        
        @keyframes draw-path {
          0% { stroke-dasharray: 300; stroke-dashoffset: 300; }
          60% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes draw-circle {
          0% { stroke-dasharray: 200; stroke-dashoffset: 200; }
          60% { stroke-dashoffset: 0; }
          100% { stroke-dashoffset: 0; }
        }
        
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-4px); }
          75% { transform: translateX(4px); }
        }
        
        .animate-pulse-subtle {
          animation: pulse-subtle 4s ease-in-out infinite;
        }
        
        .animate-expand-ring {
          animation: expand-ring 3s ease-out infinite;
        }
        
        .animate-draw-path {
          stroke-dasharray: 300;
          stroke-dashoffset: 300;
          animation: draw-path 8s ease-in-out infinite;
        }
        
        .animate-draw-circle {
          stroke-dasharray: 200;
          stroke-dashoffset: 200;
          animation: draw-circle 6s ease-in-out infinite;
        }
        
        .animate-float-whisk {
          animation: float-whisk 10s ease-in-out infinite;
        }
        
        .animate-float-slow {
          animation: float-slow 8s ease-in-out infinite;
        }
        
        .animate-float-gentle {
          animation: float-gentle 6s ease-in-out infinite;
        }
        
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
      `}</style>
    </div>
  )
}
