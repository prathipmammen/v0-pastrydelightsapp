"use client"

import { Button } from "@/components/ui/button"
import { LogOut } from "lucide-react"
import { useAuth } from "@/context/auth-context"

interface SignOutButtonProps {
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link"
  size?: "default" | "sm" | "lg" | "icon"
  className?: string
}

export default function SignOutButton({ variant = "outline", size = "sm", className = "" }: SignOutButtonProps) {
  const { signOut } = useAuth()

  return (
    <Button variant={variant} size={size} onClick={signOut} className={className}>
      <LogOut className="w-4 h-4 mr-2" />
      Sign Out
    </Button>
  )
}
