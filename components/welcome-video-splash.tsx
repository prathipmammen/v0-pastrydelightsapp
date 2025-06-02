"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import Image from "next/image"

export default function WelcomeVideoSplash() {
  const [isVideoLoaded, setIsVideoLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [showFallback, setShowFallback] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const timeoutRef = useRef<NodeJS.Timeout>()
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>()
  const router = useRouter()
  const { completeWelcomeVideo } = useAuth()

  useEffect(() => {
    // Set fallback timeout for 8 seconds
    fallbackTimeoutRef.current = setTimeout(() => {
      if (!isVideoLoaded || hasError) {
        setShowFallback(true)
        setTimeout(() => {
          completeWelcomeVideo()
          router.push("/")
        }, 2000)
      }
    }, 8000)

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (fallbackTimeoutRef.current) clearTimeout(fallbackTimeoutRef.current)
    }
  }, [isVideoLoaded, hasError, completeWelcomeVideo, router])

  const handleVideoLoaded = () => {
    setIsVideoLoaded(true)
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current)
    }
  }

  const handleVideoEnded = () => {
    timeoutRef.current = setTimeout(() => {
      completeWelcomeVideo()
      router.push("/")
    }, 500)
  }

  const handleVideoError = () => {
    console.error("Video failed to load")
    setHasError(true)
    setShowFallback(true)
    setTimeout(() => {
      completeWelcomeVideo()
      router.push("/")
    }, 2000)
  }

  const handleCanPlay = () => {
    if (videoRef.current) {
      // For mobile browsers, we need to ensure autoplay works
      const playPromise = videoRef.current.play()
      if (playPromise !== undefined) {
        playPromise.catch((error) => {
          console.error("Autoplay failed:", error)
          // If autoplay fails, still show the video but user needs to tap
          setIsVideoLoaded(true)
        })
      }
    }
  }

  if (showFallback) {
    return (
      <div className="fixed inset-0 z-50 bg-[#f9f6f1] flex items-center justify-center">
        <div className="text-center space-y-6 p-8">
          <div className="w-32 h-32 mx-auto relative">
            <Image
              src="/images/pd-logo-infinity.png"
              alt="Pastry Delights Logo"
              width={128}
              height={128}
              className="object-contain"
            />
          </div>
          <div className="space-y-2">
            <h1 className="text-3xl font-serif text-[#7B5D56]">Welcome to</h1>
            <h2 className="text-4xl font-serif text-[#7B5D56]">Pastry Delights</h2>
            <p className="text-[#7B5D56]/70 text-sm tracking-widest uppercase">Administrative Portal</p>
          </div>
          <div className="flex items-center justify-center space-x-2">
            <div className="w-2 h-2 bg-[#7B5D56] rounded-full animate-bounce"></div>
            <div className="w-2 h-2 bg-[#7B5D56] rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
            <div className="w-2 h-2 bg-[#7B5D56] rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
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
                className="object-contain"
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
        className="w-full h-full object-cover"
        autoPlay
        muted
        playsInline
        preload="auto"
        onLoadedData={handleVideoLoaded}
        onCanPlay={handleCanPlay}
        onEnded={handleVideoEnded}
        onError={handleVideoError}
        style={{
          opacity: isVideoLoaded ? 1 : 0,
          transition: "opacity 0.5s ease-in-out",
        }}
      >
        <source src="/videos/welcome-video.mp4" type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Mobile tap to play fallback */}
      {isVideoLoaded && videoRef.current?.paused && (
        <div className="absolute inset-0 bg-black/50 flex items-center justify-center z-10">
          <button
            onClick={() => videoRef.current?.play()}
            className="bg-white/20 backdrop-blur-sm rounded-full p-6 text-white hover:bg-white/30 transition-colors"
          >
            <svg className="w-12 h-12" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          </button>
        </div>
      )}
    </div>
  )
}
