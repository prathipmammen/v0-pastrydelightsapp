"use client"

import { useState, useEffect, useRef } from "react"
import { Loader2 } from "lucide-react"

interface WelcomeVideoSplashProps {
  onVideoComplete: () => void
}

export default function WelcomeVideoSplash({ onVideoComplete }: WelcomeVideoSplashProps) {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Set fallback timeout for 8 seconds
    fallbackTimeoutRef.current = setTimeout(() => {
      setShowFallback(true)
      onVideoComplete()
    }, 8000)

    return () => {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current)
      }
    }
  }, [onVideoComplete])

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true)
    // Clear fallback timeout since video loaded successfully
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
    }
  }

  const handleVideoEnded = () => {
    onVideoComplete()
  }

  const handleVideoError = () => {
    console.error("Video failed to load")
    // Don't clear timeout, let fallback handle it
  }

  if (showFallback) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 bg-[#f9f6f1] flex items-center justify-center">
      {/* Loading overlay */}
      {!isVideoLoaded && (
        <div className="absolute inset-0 bg-[#f9f6f1] flex flex-col items-center justify-center z-10">
          <div className="text-center space-y-6">
            {/* Logo */}
            <div className="w-24 h-24 mx-auto mb-4">
              <img
                src="/images/pd-logo-infinity.png"
                alt="Pastry Delights Logo"
                className="w-full h-full object-contain"
              />
            </div>

            {/* Loading animation */}
            <div className="flex items-center justify-center space-x-2">
              <Loader2 className="w-6 h-6 animate-spin text-[#7B5D56]" />
              <span className="text-[#7B5D56] text-lg font-light">Loading...</span>
            </div>

            {/* Welcome text */}
            <div className="space-y-2">
              <h2 className="text-2xl font-serif text-[#7B5D56]">Welcome to</h2>
              <h1 className="text-3xl font-serif text-[#7B5D56]">Pastry Delights Admin Portal</h1>
            </div>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        onLoadedData={handleVideoLoaded}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        preload="auto"
      >
        <source src="/videos/welcome-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Subtle overlay for branding (optional) */}
      {isVideoLoaded && (
        <div className="absolute bottom-8 left-8 right-8 text-center">
          <p className="text-white text-sm font-light tracking-wide drop-shadow-lg">
            Pastry Delights Administrative Portal
          </p>
        </div>
      )}
    </div>
  )
}
