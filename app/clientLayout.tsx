"use client"

import type React from "react"
import BottomNavigation from "@/components/bottom-navigation"
import WelcomeVideoSplash from "@/components/welcome-video-splash"
import { AuthProvider } from "@/lib/auth-context"
import { useAuth } from "@/lib/auth-context"

function LayoutContent({ children }: { children: React.ReactNode }) {
  const { shouldShowWelcomeVideo, completeWelcomeVideo } = useAuth()

  return (
    <>
      {shouldShowWelcomeVideo && <WelcomeVideoSplash onVideoComplete={completeWelcomeVideo} />}
      {children}
      <BottomNavigation />
    </>
  )
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <AuthProvider>
      <LayoutContent>{children}</LayoutContent>
    </AuthProvider>
  )
}
