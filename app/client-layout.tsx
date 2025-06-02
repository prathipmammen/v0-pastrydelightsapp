"use client"

import type React from "react"

import { useAuth } from "@/lib/auth-context"
import { usePathname } from "next/navigation"
import BottomNavigation from "@/components/bottom-navigation"
import WelcomeVideoSplash from "@/components/welcome-video-splash"

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const { shouldShowWelcomeVideo } = useAuth()
  const pathname = usePathname()

  // Don't show bottom navigation on login page
  const showBottomNav = pathname !== "/login"

  return (
    <>
      {shouldShowWelcomeVideo && <WelcomeVideoSplash />}
      {children}
      {showBottomNav && <BottomNavigation />}
    </>
  )
}
