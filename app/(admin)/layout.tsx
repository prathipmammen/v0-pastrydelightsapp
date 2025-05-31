import type React from "react"
import AdminHeader from "@/components/admin-header"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      <AdminHeader />
      <div className="p-4">{children}</div>
    </div>
  )
}
