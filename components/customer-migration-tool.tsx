"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { updateLegacyOrdersRewards, previewLegacyOrdersUpdate } from "@/lib/customer-migration"

const CustomerMigrationTool = () => {
  const [customerId, setCustomerId] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [migrationResult, setMigrationResult] = useState<any>(null)

  const [legacyOrdersPreview, setLegacyOrdersPreview] = useState<any>(null)
  const [isUpdatingLegacyOrders, setIsUpdatingLegacyOrders] = useState(false)
  const [legacyOrdersResults, setLegacyOrdersResults] = useState<any>(null)

  const handleCustomerMigration = async () => {
    setIsLoading(true)
    // Simulate an API call
    setTimeout(() => {
      setMigrationResult({
        success: true,
        message: `Customer ${customerId} migrated to new email ${newEmail}`,
      })
      setIsLoading(false)
    }, 2000)
  }

  const handlePreviewLegacyOrders = async () => {
    setIsLoading(true)
    try {
      const preview = await previewLegacyOrdersUpdate()
      setLegacyOrdersPreview(preview)
    } catch (error) {
      console.error("Error previewing legacy orders:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsLoading(false)
    }
  }

  const handleUpdateLegacyOrders = async () => {
    if (!confirm("This will update all legacy orders with proper rewards tracking. Continue?")) {
      return
    }

    setIsUpdatingLegacyOrders(true)
    try {
      const results = await updateLegacyOrdersRewards()
      setLegacyOrdersResults(results)
      alert(`Legacy orders update completed!\n${results.updated} orders updated\n${results.errors.length} errors`)
    } catch (error) {
      console.error("Error updating legacy orders:", error)
      alert(`Error: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUpdatingLegacyOrders(false)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Customer Migration Tool</h1>

      {/* Customer Migration Section */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Migrate Customer</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="customerId">Customer ID</Label>
            <Input type="text" id="customerId" value={customerId} onChange={(e) => setCustomerId(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="newEmail">New Email</Label>
            <Input type="email" id="newEmail" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
          </div>
          <Button onClick={handleCustomerMigration} disabled={isLoading}>
            {isLoading ? "Migrating..." : "Migrate"}
          </Button>
          {migrationResult && (
            <div
              className={`p-4 rounded-md ${
                migrationResult.success ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
              }`}
            >
              {migrationResult.message}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Legacy Orders Update Section */}
      <Card className="bg-orange-50/95 backdrop-blur-sm border-orange-200">
        <CardHeader className="bg-orange-100/95 border-b border-orange-200">
          <CardTitle className="text-orange-800">Legacy Orders Rewards Update</CardTitle>
          <p className="text-sm text-orange-600">
            Update all legacy orders with proper rewards tracking and customer balances.
          </p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={handlePreviewLegacyOrders}
              disabled={isLoading}
              className="bg-orange-600 hover:bg-orange-700 text-white"
            >
              {isLoading ? "Loading..." : "Preview Legacy Orders"}
            </Button>

            {legacyOrdersPreview && (
              <Button
                onClick={handleUpdateLegacyOrders}
                disabled={isUpdatingLegacyOrders}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isUpdatingLegacyOrders ? "Updating..." : "Update All Legacy Orders"}
              </Button>
            )}
          </div>

          {legacyOrdersPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-3 bg-white rounded-lg border">
                  <div className="text-2xl font-bold text-gray-800">{legacyOrdersPreview.totalOrders}</div>
                  <div className="text-sm text-gray-600">Total Orders</div>
                </div>
                <div className="text-center p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <div className="text-2xl font-bold text-orange-800">{legacyOrdersPreview.legacyOrders}</div>
                  <div className="text-sm text-orange-600">Legacy Orders</div>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                  <div className="text-2xl font-bold text-green-800">{legacyOrdersPreview.paidLegacyOrders}</div>
                  <div className="text-sm text-green-600">PAID Legacy</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                  <div className="text-2xl font-bold text-red-800">{legacyOrdersPreview.unpaidLegacyOrders}</div>
                  <div className="text-sm text-red-600">UNPAID Legacy</div>
                </div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-orange-100 sticky top-0">
                    <tr>
                      <th className="text-left p-2 border">Receipt ID</th>
                      <th className="text-left p-2 border">Customer</th>
                      <th className="text-left p-2 border">Status</th>
                      <th className="text-left p-2 border">Current Points</th>
                      <th className="text-left p-2 border">Will Earn</th>
                      <th className="text-left p-2 border">New Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {legacyOrdersPreview.preview.slice(0, 50).map((order: any, index: number) => (
                      <tr key={index} className="hover:bg-orange-50">
                        <td className="p-2 border font-mono text-xs">{order.receiptId}</td>
                        <td className="p-2 border">{order.customerName}</td>
                        <td className="p-2 border">
                          <span
                            className={`px-2 py-1 rounded text-xs ${
                              order.isPaid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.isPaid ? "PAID" : "UNPAID"}
                          </span>
                        </td>
                        <td className="p-2 border text-center">{order.currentPointsEarned}</td>
                        <td className="p-2 border text-center font-semibold text-green-600">
                          {order.calculatedPointsEarned}
                        </td>
                        <td className="p-2 border text-center font-semibold text-blue-600">
                          {order.calculatedBalance}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {legacyOrdersPreview.preview.length > 50 && (
                  <p className="text-center text-sm text-gray-500 mt-2">
                    Showing first 50 of {legacyOrdersPreview.preview.length} legacy orders
                  </p>
                )}
              </div>
            </div>
          )}

          {legacyOrdersResults && (
            <div className="mt-4 p-4 bg-white rounded-lg border">
              <h4 className="font-semibold text-green-800 mb-2">Update Results</h4>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-green-50 rounded border border-green-200">
                  <div className="text-xl font-bold text-green-800">{legacyOrdersResults.updated}</div>
                  <div className="text-sm text-green-600">Orders Updated</div>
                </div>
                <div className="text-center p-3 bg-red-50 rounded border border-red-200">
                  <div className="text-xl font-bold text-red-800">{legacyOrdersResults.errors.length}</div>
                  <div className="text-sm text-red-600">Errors</div>
                </div>
              </div>

              {legacyOrdersResults.errors.length > 0 && (
                <div className="mt-4">
                  <h5 className="font-medium text-red-800 mb-2">Errors:</h5>
                  <div className="max-h-32 overflow-y-auto bg-red-50 p-2 rounded border border-red-200">
                    {legacyOrdersResults.errors.map((error: string, index: number) => (
                      <div key={index} className="text-sm text-red-700">
                        {error}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default CustomerMigrationTool
