"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import {
  Plus,
  Receipt,
  History,
  TrendingUp,
  Eye,
  Edit,
  Trash2,
  Download,
  Filter,
  AlertCircle,
  Wifi,
  WifiOff,
} from "lucide-react"
import { subscribeToOrders, deleteOrder, type FirestoreOrder, exportOrdersToCSV } from "@/lib/firestore"

export default function HistoryPage() {
  const router = useRouter()
  const [customerNameFilter, setCustomerNameFilter] = useState("")
  const [contactFilter, setContactFilter] = useState("")
  const [receiptIdFilter, setReceiptIdFilter] = useState("")
  const [pickupDateFilter, setPickupDateFilter] = useState("")
  const [orders, setOrders] = useState<FirestoreOrder[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)

  useEffect(() => {
    console.log("🔄 Setting up Firestore real-time listener...")

    const unsubscribe = subscribeToOrders(
      (firestoreOrders) => {
        console.log("📡 Received orders update:", firestoreOrders.length, "orders")
        setOrders(firestoreOrders)
        setIsConnected(true)
        setError(null)
      },
      (error) => {
        console.error("❌ Firestore connection error:", error)
        setError(error.message)
        setIsConnected(false)
      },
    )

    // Cleanup subscription on unmount
    return () => {
      console.log("🔌 Cleaning up Firestore listener")
      unsubscribe()
    }
  }, [])

  const filteredOrders = orders.filter((order) => {
    const matchesCustomerName = order.customerName.toLowerCase().includes(customerNameFilter.toLowerCase())
    const matchesContact = order.customerContact.toLowerCase().includes(contactFilter.toLowerCase())
    const matchesReceiptId = order.receiptId.toLowerCase().includes(receiptIdFilter.toLowerCase())
    const matchesPickupDate = pickupDateFilter === "" || order.deliveryDate === pickupDateFilter

    return matchesCustomerName && matchesContact && matchesReceiptId && matchesPickupDate
  })

  const handleViewReceipt = (order: FirestoreOrder) => {
    localStorage.setItem("currentOrder", JSON.stringify(order))
    router.push("/receipt")
  }

  const handleEditOrder = (order: FirestoreOrder) => {
    localStorage.setItem("editOrder", JSON.stringify(order))
    router.push("/edit")
  }

  const handleDeleteOrder = async (order: FirestoreOrder) => {
    if (!order.id) {
      console.error("❌ Cannot delete order: missing Firestore ID")
      return
    }

    if (confirm(`Are you sure you want to delete order #${order.receiptId}?`)) {
      setIsDeleting(order.id)
      try {
        await deleteOrder(order.id)
        console.log("✅ Order deleted successfully")
        // The real-time listener will automatically update the UI
      } catch (error) {
        console.error("❌ Error deleting order:", error)
        alert(`Failed to delete order: ${error instanceof Error ? error.message : "Unknown error"}`)
      } finally {
        setIsDeleting(null)
      }
    }
  }

  const handleExportToExcel = () => {
    exportOrdersToCSV(orders)
  }

  const totalItemsInFiltered = filteredOrders.reduce((sum, order) => sum + order.items.length, 0)

  return (
    <div
      className="min-h-screen p-2 sm:p-4 flex flex-col"
      style={{
        backgroundImage: "url('/images/pastry-background.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="max-w-6xl mx-auto flex-grow w-full">
        {/* Connection Status & Error Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">
              <strong>Firebase Error:</strong> {error}
            </span>
          </div>
        )}

        {/* Order History Card */}
        <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200">
          <CardHeader className="bg-amber-100/95 border-b border-amber-200">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <CardTitle className="flex items-center gap-2 text-amber-800">
                Order History ({orders.length})
                <Badge
                  className={`text-xs flex items-center gap-1 ${
                    isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? "Live Sync" : "Disconnected"}
                </Badge>
              </CardTitle>
              <Button
                onClick={handleExportToExcel}
                className="bg-green-600 hover:bg-green-700 text-white flex items-center gap-2 text-xs sm:text-sm"
                size="sm"
              >
                <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Export Orders to Excel</span>
                <span className="sm:hidden">Export</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Filter Section */}
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-amber-600" />
                <span className="font-medium text-amber-800 text-sm sm:text-base">Filter Orders</span>
                <span className="text-xs sm:text-sm text-gray-500">
                  ({filteredOrders.length} of {orders.length} shown)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">Customer Name</label>
                  <Input
                    placeholder="Search by name..."
                    value={customerNameFilter}
                    onChange={(e) => setCustomerNameFilter(e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">Contact Info</label>
                  <Input
                    placeholder="Search by phone/email..."
                    value={contactFilter}
                    onChange={(e) => setContactFilter(e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">Receipt ID</label>
                  <Input
                    placeholder="Search by ID..."
                    value={receiptIdFilter}
                    onChange={(e) => setReceiptIdFilter(e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">Pickup Date</label>
                  <Input
                    type="date"
                    placeholder="mm/dd/yyyy"
                    value={pickupDateFilter}
                    onChange={(e) => setPickupDateFilter(e.target.value)}
                    className="bg-white text-sm"
                  />
                </div>
              </div>
            </div>

            {/* Orders List */}
            <div className="space-y-4">
              {filteredOrders.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p className="text-sm sm:text-base">
                    {orders.length === 0 ? "No orders found in Firebase." : "No orders found matching your criteria."}
                  </p>
                  {orders.length === 0 && (
                    <p className="text-xs text-gray-400 mt-2">Orders will appear here automatically when submitted.</p>
                  )}
                </div>
              ) : (
                filteredOrders.map((order) => (
                  <Card key={order.id} className="bg-white/90 backdrop-blur-sm border border-amber-200">
                    <CardContent className="p-4">
                      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                        <div className="space-y-2 flex-1">
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                            <span className="font-semibold text-amber-800 text-sm sm:text-base">
                              Receipt #{order.receiptId}
                            </span>
                            <Badge className="bg-yellow-100 text-yellow-800 text-xs">pending</Badge>
                            {order.id && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                Firebase: {order.id.substring(0, 8)}...
                              </Badge>
                            )}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-4 text-xs sm:text-sm">
                            <div className="space-y-1">
                              <div>
                                <span className="font-medium text-amber-700">Customer:</span> {order.customerName}
                              </div>
                              <div>
                                <span className="font-medium text-amber-700">Contact:</span>{" "}
                                {order.customerContact === "Not provided"
                                  ? "No Contact provided"
                                  : order.customerContact}
                              </div>
                              <div>
                                <span className="font-medium text-amber-700">
                                  {order.isDelivery ? "Delivery:" : "Pickup:"}
                                </span>{" "}
                                {order.deliveryDate} at {order.deliveryTime} • {order.paymentMethod}
                              </div>
                              <div>
                                <span className="font-medium text-amber-700">Items:</span> {order.items.length} items
                              </div>
                            </div>

                            {order.isDelivery && order.deliveryAddress !== "Not provided" && (
                              <div className="space-y-1">
                                <div className="text-blue-600">
                                  <span className="font-medium">🚚 Delivery Address:</span>
                                </div>
                                <div className="text-blue-700 text-xs sm:text-sm">{order.deliveryAddress}</div>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="text-center lg:text-right space-y-3">
                          <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
                            <div className="text-xl sm:text-2xl font-bold text-amber-800">
                              ${order.finalTotal.toFixed(2)}
                            </div>
                            {order.isDelivery && <Badge className="bg-blue-100 text-blue-800 text-xs">Delivery</Badge>}
                            <Badge
                              className={`text-xs flex items-center gap-1 ${
                                isConnected ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                              {isConnected ? "Live" : "Offline"}
                            </Badge>
                          </div>

                          <div className="flex flex-wrap gap-1 sm:gap-2 justify-center lg:justify-end">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleViewReceipt(order)}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Eye className="w-3 h-3" />
                              <span className="hidden sm:inline">View</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleEditOrder(order)}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Edit className="w-3 h-3" />
                              <span className="hidden sm:inline">Edit</span>
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteOrder(order)}
                              disabled={isDeleting === order.id}
                              className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                            >
                              {isDeleting === order.id ? (
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-red-600"></div>
                              ) : (
                                <Trash2 className="w-3 h-3" />
                              )}
                              <span className="hidden sm:inline">
                                {isDeleting === order.id ? "Deleting..." : "Delete"}
                              </span>
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>

            {/* Summary Stats */}
            {orders.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 pt-6 border-t border-amber-200">
                <div className="text-center p-4 bg-white/90 rounded-lg border border-amber-200">
                  <div className="text-xl sm:text-2xl font-bold text-amber-800">{filteredOrders.length}</div>
                  <div className="text-xs sm:text-sm text-amber-600">Filtered Orders</div>
                </div>
                <div className="text-center p-4 bg-white/90 rounded-lg border border-amber-200">
                  <div className="text-xl sm:text-2xl font-bold text-green-800">{totalItemsInFiltered}</div>
                  <div className="text-xs sm:text-sm text-green-600">Total Items</div>
                </div>
                <div className="text-center p-4 bg-white/90 rounded-lg border border-amber-200">
                  <div className="text-xl sm:text-2xl font-bold text-blue-800">
                    ${filteredOrders.reduce((sum, order) => sum + order.finalTotal, 0).toFixed(2)}
                  </div>
                  <div className="text-xs sm:text-sm text-blue-600">Total Revenue</div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Navigation Footer - Always at bottom */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm mt-4 sm:mt-6 sticky bottom-0">
        <div className="p-4 sm:p-6 flex justify-center">
          <div className="flex flex-wrap gap-2 sm:gap-4">
            <Button
              variant="outline"
              className="flex items-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => router.push("/")}
            >
              <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Order</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => router.push("/receipt")}
            >
              <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Receipt</span>
            </Button>
            <Button
              variant="default"
              className="flex items-center gap-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white"
            >
              <History className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">History ({orders.length})</span>
              <span className="sm:hidden">({orders.length})</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => router.push("/trends")}
            >
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Trends</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
