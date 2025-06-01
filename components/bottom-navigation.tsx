"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Calendar, History, TrendingUp, RefreshCcw } from "lucide-react"

export default function BottomNavigation() {
  const pathname = usePathname()

  const isActive = (path: string) => {
    return pathname === path
  }

  const navItems = [
    {
      name: "Home",
      href: "/",
      icon: <Home className="w-5 h-5" />,
    },
    {
      name: "Calendar",
      href: "/calendar",
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      name: "History",
      href: "/history",
      icon: <History className="w-5 h-5" />,
    },
    {
      name: "Trends",
      href: "/trends",
      icon: <TrendingUp className="w-5 h-5" />,
    },
    {
      name: "Migration",
      href: "/customer-migration",
      icon: <RefreshCcw className="w-5 h-5" />,
    },
  ]

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 flex justify-around items-center h-16 z-50">
      {navItems.map((item) => (
        <Link
          key={item.name}
          href={item.href}
          className={`flex flex-col items-center justify-center w-full h-full ${
            isActive(item.href) ? "text-amber-600" : "text-gray-500 hover:text-amber-600"
          }`}
        >
          {item.icon}
          <span className="text-xs mt-1">{item.name}</span>
        </Link>
      ))}
    </div>
  )
}
