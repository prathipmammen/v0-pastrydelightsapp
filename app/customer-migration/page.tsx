"use client"

import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import CustomerMigrationTool from "@/components/customer-migration-tool"
import ProtectedRoute from "@/components/protected-route"

export default function CustomerMigrationPage() {
  const router = useRouter()

  return (
    <ProtectedRoute>
      <div
        className="min-h-screen p-4 flex flex-col"
        style={{
          backgroundImage: "url('/images/pastry-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="max-w-4xl mx-auto flex-grow w-full">
          <div className="mb-6">
            <Button
              onClick={() => router.back()}
              variant="outline"
              className="flex items-center gap-2 bg-white hover:bg-gray-100 text-amber-700 border-amber-300"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Button>
          </div>

          <CustomerMigrationTool />
        </div>
      </div>
    </ProtectedRoute>
  )
}
