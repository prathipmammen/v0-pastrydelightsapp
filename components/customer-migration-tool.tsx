"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Users, Database, RefreshCw, CheckCircle, Eye, Play } from "lucide-react"
import { migrateAllCustomers, previewCustomerMigration } from "@/lib/customer-migration"

export default function CustomerMigrationTool() {
  const [isLoading, setIsLoading] = useState(false)
  const [preview, setPreview] = useState<any>(null)
  const [migrationResults, setMigrationResults] = useState<any>(null)
  const [showPreview, setShowPreview] = useState(false)

  const handlePreview = async () => {
    setIsLoading(true)
    try {
      const results = await previewCustomerMigration()
      setPreview(results)
      setShowPreview(true)
      console.log("📊 Migration Preview:", results)
    } catch (error) {
      console.error("❌ Preview failed:", error)
      alert(`Preview failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleMigration = async () => {
    if (
      !confirm(
        "Are you sure you want to migrate all customer data? This will create customer records for anyone who has placed orders but doesn't have a customer account yet.",
      )
    ) {
      return
    }

    setIsLoading(true)
    try {
      const results = await migrateAllCustomers()
      setMigrationResults(results)
      console.log("✅ Migration Results:", results)

      // Refresh preview after migration
      const newPreview = await previewCustomerMigration()
      setPreview(newPreview)
    } catch (error) {
      console.error("❌ Migration failed:", error)
      alert(`Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200">
        <CardHeader className="bg-amber-100/95 border-b border-amber-200">
          <CardTitle className="flex items-center gap-2 text-amber-800">
            <Database className="w-5 h-5" />
            Customer Migration Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="text-sm text-amber-700">
            This tool will scan all your orders and ensure every customer has a proper rewards account with accurate
            points.
          </div>

          <div className="flex gap-4">
            <Button
              onClick={handlePreview}
              disabled={isLoading}
              variant="outline"
              className="flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
              Preview Migration
            </Button>

            <Button
              onClick={handleMigration}
              disabled={isLoading || !preview}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
              Run Migration
            </Button>
          </div>

          {migrationResults && (
            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center gap-2 text-green-800 font-medium mb-2">
                <CheckCircle className="w-4 h-4" />
                Migration Completed!
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <div>✅ {migrationResults.migrated} new customers created</div>
                <div>🔄 {migrationResults.updated} existing customers updated</div>
                {migrationResults.errors.length > 0 && (
                  <div className="text-red-600">❌ {migrationResults.errors.length} errors occurred</div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showPreview && preview && (
        <Card className="bg-white/90 backdrop-blur-sm border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Users className="w-5 h-5" />
              Migration Preview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <div className="text-2xl font-bold text-blue-800">{preview.existingCustomers}</div>
                <div className="text-sm text-blue-600">Existing Customers</div>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-2xl font-bold text-green-800">{preview.needsMigration}</div>
                <div className="text-sm text-green-600">Need Migration</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-2xl font-bold text-orange-800">{preview.needsUpdate}</div>
                <div className="text-sm text-orange-600">Need Update</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-2xl font-bold text-purple-800">{preview.customersFromOrders}</div>
                <div className="text-sm text-purple-600">Total from Orders</div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <h4 className="font-medium text-amber-800">Customer Details:</h4>
              <div className="max-h-96 overflow-y-auto space-y-2">
                {preview.preview.map((customer: any, index: number) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-600">
                          {customer.totalOrders} orders • ${customer.totalSpent.toFixed(2)} spent
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        {customer.status === "needs_update" && (
                          <div className="text-sm text-orange-600">
                            {customer.currentPoints} → {customer.calculatedPoints} pts
                          </div>
                        )}
                        {customer.status === "new" && (
                          <div className="text-sm text-green-600">{customer.calculatedPoints} pts</div>
                        )}
                        {customer.status === "exists" && (
                          <div className="text-sm text-blue-600">{customer.calculatedPoints} pts</div>
                        )}
                      </div>
                      <Badge
                        className={
                          customer.status === "new"
                            ? "bg-green-100 text-green-800"
                            : customer.status === "needs_update"
                              ? "bg-orange-100 text-orange-800"
                              : "bg-blue-100 text-blue-800"
                        }
                      >
                        {customer.status === "new" ? "New" : customer.status === "needs_update" ? "Update" : "OK"}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
