"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

export default function WelcomeVideoSplash() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()
  const { completeWelcomeVideo } = useAuth()

  useEffect(() => {
    // Set fallback timeout for 10 seconds in case video doesn't load
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!isVideoLoaded || hasError) {
        console.log("Video loading timeout, showing fallback")
        setShowFallback(true)
        setTimeout(() => {
          completeWelcomeVideo()
          router.push("/")
        }, 2000)
      }
    }, 10000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    }
  }, [isVideoLoaded, hasError, completeWelcomeVideo, router])

  const handleVideoLoaded = () => {
    console.log("Video loaded successfully")
    setIsVideoLoaded(true)
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
    }
  }

  const handleVideoEnded = () => {
    console.log("Video ended")
    timeoutRef.current = setTimeout(() => {
      completeWelcomeVideo()
      router.push("/")
    }, 500)
  }

  const handleVideoError = (e: any) => {
    console.error("Video failed to load:", e)
    setHasError(true)
    setShowFallback(true)
    setTimeout(() => {
      completeWelcomeVideo()
      router.push("/")
    }, 2000)
  }

  const handleCanPlay = () => {
    console.log("Video can play")
    if (videoRef.current) {
      // For mobile browsers, we need to ensure autoplay works
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log("Video started playing")
            setIsPlaying(true)
          })
          .catch((error) => {
            console.error("Autoplay failed:", error)
            // If autoplay fails, still show the video but user needs to tap
            setIsVideoLoaded(true)
          })
      }
    }
  }

  const handleVideoClick = () => {
    if (videoRef.current && videoRef.current.paused) {
      videoRef.current.play()
      setIsPlaying(true)
    }
  }

  const handleSkip = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current)
    if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    completeWelcomeVideo()
    router.push("/")
  }

  // Animated fallback when video fails
  if (showFallback) {
    return (
      <div className="fixed inset-0 z-50 bg-gradient-to-br from-[#f9f6f1] to-[#f0e6d6] flex items-center justify-center">
        <div className="text-center space-y-8 p-8 max-w-md mx-auto">
          <div className="w-40 h-40 mx-auto relative animate-pulse">
            <Image
              src="/images/pd-logo-infinity.png"
              alt="Pastry Delights Logo"
              width={160}
              height={160}
              className="object-contain drop-shadow-lg"
            />
          </div>
          <div className="space-y-4">
            <h1 className="text-5xl font-serif text-[#7B5D56] mb-2">Welcome to</h1>
            <h2 className="text-6xl font-serif text-[#7B5D56] font-bold">Pastry Delights</h2>
            <p className="text-[#7B5D56]/80 text-lg tracking-widest uppercase font-light">Administrative Portal</p>
          </div>
          <div className="flex justify-center space-x-3">
            <div className="w-3 h-3 bg-[#7B5D56] rounded-full animate-bounce"></div>
            <div className="w-3 h-3 bg-[#7B5D56] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
            <div className="w-3 h-3 bg-[#7B5D56] rounded-full animate-bounce" style={{ animationDelay: "0.4s" }}></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* Loading overlay */}
      {!isVideoLoaded && !hasError && (
        <div className="absolute inset-0 bg-[#f9f6f1] flex items-center justify-center z-10">
          <div className="text-center space-y-6 p-8">
            <div className="w-24 h-24 mx-auto relative">
              <Image
                src="/images/pd-logo-infinity.png"
                alt="Pastry Delights Logo"
                width={96}
                height={96}
                className="object-contain animate-pulse"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-serif text-[#7B5D56]">Welcome to Pastry Delights</h1>
              <p className="text-[#7B5D56]/70 text-xs tracking-widest uppercase">Administrative Portal</p>
            </div>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-2 h-2 bg-[#7B5D56] rounded-full animate-bounce"></div>
              <div
                className="w-2 h-2 bg-[#7B5D56] rounded-full animate-bounce"
                style={{ animationDelay: "0.1s" }}
              ></div>
              <div
                className="w-2 h-2 bg-[#7B5D56] rounded-full animate-bounce"
                style={{ animationDelay: "0.2s" }}
              ></div>
            </div>
          </div>
        </div>
      )}

      {/* Video element */}
      <video
        ref={videoRef}
        className="w-full h-full object-cover cursor-pointer"
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={handleVideoLoaded}
        onCanPlay={handleCanPlay}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        onClick={handleVideoClick}
        style={{
          opacity: isVideoLoaded ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        <source src="/videos/welcome-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Mobile tap to play overlay */}
      {isVideoLoaded && !isPlaying && (
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center z-10">
          <div className="text-center space-y-4">
            <button
              onClick={handleVideoClick}
              className="bg-white/20 backdrop-blur-sm rounded-full p-6 text-white hover:bg-white/30 transition-colors"
            >
              <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            </button>
            <p className="text-white text-sm">Tap to play</p>
          </div>
        </div>
      )}

      {/* Skip button */}
      {isVideoLoaded && (
        <button
          onClick={handleSkip}
          className="absolute top-6 right-6 z-20 px-4 py-2 bg-black/50 text-white text-sm rounded-full hover:bg-black/70 transition-colors backdrop-blur-sm"
        >
          Skip
        </button>
      )}

      {/* Logo overlay during video */}
      {isVideoLoaded && isPlaying && (
        <div className="absolute bottom-8 left-8 z-20">
          <div className="flex items-center space-x-3 bg-black/30 backdrop-blur-sm rounded-full px-4 py-2">
            <div className="w-8 h-8 relative">
              <Image
                src="/images/pd-logo-infinity.png"
                alt="Pastry Delights Logo"
                width={32}
                height={32}
                className="object-contain"
              />
            </div>
            <span className="text-white text-sm font-medium">Pastry Delights</span>
          </div>
        </div>
      )}
    </div>
  )
}
