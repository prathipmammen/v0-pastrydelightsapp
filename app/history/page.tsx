"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import {
  LogOut,
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
  ChevronLeft,
  ChevronRight,
  CreditCard,
  CalendarIcon,
} from "lucide-react"
import {
  subscribeToOrders,
  deleteOrder,
  updatePaymentStatus,
  type FirestoreOrder,
  exportOrdersToCSV,
} from "@/lib/firestore"
import ProtectedRoute from "@/components/protected-route"
import { useAuth } from "@/lib/auth-context"

const ORDERS_PER_PAGE = 10

export default function HistoryPage() {
  const router = useRouter()
  const { signOut } = useAuth()
  const [customerNameFilter, setCustomerNameFilter] = useState("")
  const [contactFilter, setContactFilter] = useState("")
  const [receiptIdFilter, setReceiptIdFilter] = useState("")
  const [pickupDateFromFilter, setPickupDateFromFilter] = useState("")
  const [pickupDateToFilter, setPickupDateToFilter] = useState("")
  const [paymentStatusFilter, setPaymentStatusFilter] = useState<"ALL" | "PAID" | "UNPAID">("ALL") // New payment status filter
  const [orders, setOrders] = useState<FirestoreOrder[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [isUpdatingPayment, setIsUpdatingPayment] = useState<string | null>(null) // New state for payment updates
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    console.log("🔄 Setting up Firestore real-time listener...")

    const unsubscribe = subscribeToOrders(
      (firestoreOrders) => {
        console.log("📡 Received orders update:", firestoreOrders.length, "orders")
        // Sort orders by creation date (newest first)
        const sortedOrders = firestoreOrders.sort((a, b) => {
          const dateA = new Date(a.createdAt).getTime()
          const dateB = new Date(b.createdAt).getTime()
          return dateB - dateA // Descending order (newest first)
        })
        setOrders(sortedOrders)
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

  // Filter orders based on search criteria including payment status
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesCustomerName = order.customerName.toLowerCase().includes(customerNameFilter.toLowerCase())
      const matchesContact = order.customerContact.toLowerCase().includes(contactFilter.toLowerCase())
      const matchesReceiptId = order.receiptId.toLowerCase().includes(receiptIdFilter.toLowerCase())

      // Payment status filtering
      const matchesPaymentStatus =
        paymentStatusFilter === "ALL" ||
        order.paymentStatus === paymentStatusFilter ||
        (paymentStatusFilter === "PAID" && order.isPaid) || // Backward compatibility
        (paymentStatusFilter === "UNPAID" && !order.isPaid && !order.paymentStatus) // Backward compatibility

      // Date range filtering
      let matchesDateRange = true
      if (pickupDateFromFilter || pickupDateToFilter) {
        const orderDate = new Date(order.deliveryDate)

        if (pickupDateFromFilter) {
          const fromDate = new Date(pickupDateFromFilter)
          matchesDateRange = matchesDateRange && orderDate >= fromDate
        }

        if (pickupDateToFilter) {
          const toDate = new Date(pickupDateToFilter)
          // Set to end of day for inclusive filtering
          toDate.setHours(23, 59, 59, 999)
          matchesDateRange = matchesDateRange && orderDate <= toDate
        }
      }

      return matchesCustomerName && matchesContact && matchesReceiptId && matchesDateRange && matchesPaymentStatus
    })
  }, [
    orders,
    customerNameFilter,
    contactFilter,
    receiptIdFilter,
    pickupDateFromFilter,
    pickupDateToFilter,
    paymentStatusFilter,
  ])

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [
    customerNameFilter,
    contactFilter,
    receiptIdFilter,
    pickupDateFromFilter,
    pickupDateToFilter,
    paymentStatusFilter,
  ])

  // Calculate pagination
  const totalPages = Math.ceil(filteredOrders.length / ORDERS_PER_PAGE)
  const startIndex = (currentPage - 1) * ORDERS_PER_PAGE
  const endIndex = startIndex + ORDERS_PER_PAGE
  const currentPageOrders = filteredOrders.slice(startIndex, endIndex)

  // Calculate statistics for all filtered orders
  const allFilteredStats = useMemo(() => {
    const totalItems = filteredOrders.reduce((sum, order) => sum + order.items.length, 0)
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.finalTotal, 0)
    const paidOrders = filteredOrders.filter((order) => order.paymentStatus === "PAID" || order.isPaid).length
    const unpaidOrders = filteredOrders.length - paidOrders
    return { totalItems, totalRevenue, paidOrders, unpaidOrders }
  }, [filteredOrders])

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

  // New function to handle payment status updates
  const handlePaymentStatusUpdate = async (order: FirestoreOrder, newStatus: "PAID" | "UNPAID") => {
    if (!order.id) {
      console.error("❌ Cannot update payment status: missing Firestore ID")
      return
    }

    setIsUpdatingPayment(order.id)
    try {
      await updatePaymentStatus(order.id, newStatus)
      console.log("✅ Payment status updated successfully")
      // The real-time listener will automatically update the UI
    } catch (error) {
      console.error("❌ Error updating payment status:", error)
      alert(`Failed to update payment status: ${error instanceof Error ? error.message : "Unknown error"}`)
    } finally {
      setIsUpdatingPayment(null)
    }
  }

  const handleExportToExcel = () => {
    // Export all orders, not just filtered ones
    exportOrdersToCSV(orders)
  }

  const handlePreviousPage = () => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1))
  }

  const handlePageClick = (page: number) => {
    setCurrentPage(page)
  }

  // Generate page numbers for pagination display
  const getPageNumbers = () => {
    const pages = []
    const maxVisiblePages = 5
    let startPage = Math.max(1, currentPage - Math.floor(maxVisiblePages / 2))
    const endPage = Math.min(totalPages, startPage + maxVisiblePages - 1)

    // Adjust start page if we're near the end
    if (endPage - startPage + 1 < maxVisiblePages) {
      startPage = Math.max(1, endPage - maxVisiblePages + 1)
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i)
    }
    return pages
  }

  // Helper function to get payment status display
  const getPaymentStatusDisplay = (order: FirestoreOrder) => {
    const status = order.paymentStatus || (order.isPaid ? "PAID" : "UNPAID")
    const isPaid = status === "PAID"

    return {
      status,
      isPaid,
      icon: isPaid ? "🟢" : "🔴",
      className: isPaid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800",
    }
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      router.push("/login")
    } catch (error) {
      console.error("Error signing out:", error)
    }
  }

  return (
    <ProtectedRoute>
      {/* Sign Out Button - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={handleSignOut}
          className="bg-white hover:bg-gray-100 text-amber-700 border-amber-300 shadow-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
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
                  <span className="hidden sm:inline">Export All Orders to Excel</span>
                  <span className="sm:hidden">Export All</span>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
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
                    <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">Payment Status</label>
                    <Select
                      value={paymentStatusFilter}
                      onValueChange={(value: "ALL" | "PAID" | "UNPAID") => setPaymentStatusFilter(value)}
                    >
                      <SelectTrigger className="bg-white text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Orders</SelectItem>
                        <SelectItem value="PAID">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                            PAID Only
                          </div>
                        </SelectItem>
                        <SelectItem value="UNPAID">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                            UNPAID Only
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">From Date</label>
                    <Input
                      type="date"
                      placeholder="Start date"
                      value={pickupDateFromFilter}
                      onChange={(e) => setPickupDateFromFilter(e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-amber-700 mb-1">To Date</label>
                    <Input
                      type="date"
                      placeholder="End date"
                      value={pickupDateToFilter}
                      onChange={(e) => setPickupDateToFilter(e.target.value)}
                      className="bg-white text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Customer Summary - Show when filtering by specific customer */}
              {customerNameFilter &&
                filteredOrders.length > 0 &&
                (() => {
                  // Calculate total points for this customer from PAID orders only
                  const customerOrders = filteredOrders.filter((order) =>
                    order.customerName.toLowerCase().includes(customerNameFilter.toLowerCase()),
                  )

                  if (customerOrders.length > 0) {
                    const customerName = customerOrders[0].customerName
                    const totalPointsEarned = customerOrders
                      .filter((order) => order.paymentStatus === "PAID" || order.isPaid)
                      .reduce((sum, order) => sum + (order.pointsEarned || Math.floor(order.finalTotal)), 0)

                    const totalPointsRedeemed = customerOrders.reduce(
                      (sum, order) => sum + (order.pointsRedeemed || 0),
                      0,
                    )

                    const currentBalance = Math.max(0, totalPointsEarned - totalPointsRedeemed)

                    return (
                      <Card className="bg-purple-50/95 backdrop-blur-sm border-purple-200 mb-4">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <h3 className="font-semibold text-purple-800">{customerName}</h3>
                              <p className="text-sm text-purple-600">Customer Reward Summary</p>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-purple-800">{currentBalance} pts</div>
                              <div className="text-xs text-purple-600">
                                {totalPointsEarned} earned • {totalPointsRedeemed} redeemed
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  }
                  return null
                })()}

              {/* Pagination Info */}
              {filteredOrders.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 text-sm text-amber-700">
                  <span>
                    Showing {startIndex + 1}-{Math.min(endIndex, filteredOrders.length)} of {filteredOrders.length}{" "}
                    {filteredOrders.length === 1 ? "order" : "orders"}
                  </span>
                  {totalPages > 1 && (
                    <span className="font-medium">
                      Page {currentPage} of {totalPages}
                    </span>
                  )}
                </div>
              )}

              {/* Orders List */}
              <div className="space-y-4">
                {currentPageOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <History className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p className="text-sm sm:text-base">
                      {orders.length === 0 ? "No orders found in Firebase." : "No orders found matching your criteria."}
                    </p>
                    {orders.length === 0 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Orders will appear here automatically when submitted.
                      </p>
                    )}
                  </div>
                ) : (
                  currentPageOrders.map((order) => {
                    const paymentDisplay = getPaymentStatusDisplay(order)

                    return (
                      <Card key={order.id} className="bg-white/90 backdrop-blur-sm border border-amber-200">
                        <CardContent className="p-3 sm:p-4">
                          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-start gap-4">
                            <div className="space-y-2 flex-1">
                              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                                <span className="font-semibold text-amber-800 text-sm sm:text-base">
                                  Receipt #{order.receiptId}
                                </span>

                                {/* Payment Status Badge with Toggle */}
                                <div className="flex items-center gap-2">
                                  <Badge className={`text-xs flex items-center gap-1 ${paymentDisplay.className}`}>
                                    <span>{paymentDisplay.icon}</span>
                                    {paymentDisplay.status}
                                  </Badge>

                                  {/* Quick Payment Status Toggle */}
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                      handlePaymentStatusUpdate(order, paymentDisplay.isPaid ? "UNPAID" : "PAID")
                                    }
                                    disabled={isUpdatingPayment === order.id}
                                    className="h-6 px-2 text-xs border-gray-300 hover:bg-gray-50"
                                    title={`Mark as ${paymentDisplay.isPaid ? "UNPAID" : "PAID"}`}
                                  >
                                    {isUpdatingPayment === order.id ? (
                                      <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-gray-600"></div>
                                    ) : (
                                      <CreditCard className="w-3 h-3" />
                                    )}
                                  </Button>
                                </div>
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
                                    <span className="font-medium text-amber-700">Items:</span> {order.items.length}{" "}
                                    items
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

                              {/* Rewards info - Only show for PAID orders */}
                              {(() => {
                                const paymentDisplay = getPaymentStatusDisplay(order)
                                const isPaid = paymentDisplay.isPaid

                                if (isPaid) {
                                  // Show rewards for PAID orders
                                  return (
                                    <div className="mt-2 p-2 bg-purple-50 rounded border border-purple-200">
                                      <div className="text-xs text-purple-700">
                                        <strong>Rewards:</strong>
                                        {order.pointsEarned > 0 ? (
                                          <span className="text-green-600"> +{order.pointsEarned} earned</span>
                                        ) : (
                                          <span className="text-green-600">
                                            {" "}
                                            +{Math.floor(order.finalTotal)} earned
                                          </span>
                                        )}
                                        {order.pointsRedeemed > 0 && (
                                          <span className="text-red-600"> -{order.pointsRedeemed} redeemed</span>
                                        )}
                                        {order.customerRewardsBalance > 0 ? (
                                          <span> • Balance: {order.customerRewardsBalance} pts</span>
                                        ) : (
                                          <span className="text-gray-600"> • Balance: Not tracked</span>
                                        )}
                                        {(!order.pointsEarned || order.pointsEarned === 0) && (
                                          <span className="text-orange-600 ml-2">
                                            (Legacy order - run migration to update)
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  )
                                } else {
                                  // Show "no rewards yet" for UNPAID orders
                                  return (
                                    <div className="mt-2 p-2 bg-gray-50 rounded border border-gray-200">
                                      <div className="text-xs text-gray-600">
                                        <strong>Rewards:</strong>
                                        <span className="text-orange-600">
                                          {" "}
                                          Payment required to earn +{Math.floor(order.finalTotal)} points
                                        </span>
                                      </div>
                                    </div>
                                  )
                                }
                              })()}
                            </div>

                            <div className="text-center lg:text-right space-y-3">
                              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-2">
                                <div className="text-xl sm:text-2xl font-bold text-amber-800">
                                  ${order.finalTotal.toFixed(2)}
                                </div>
                                {order.isDelivery && (
                                  <Badge className="bg-blue-100 text-blue-800 text-xs">Delivery</Badge>
                                )}
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
                    )
                  })
                )}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-amber-200">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handlePreviousPage}
                      disabled={currentPage === 1}
                      className="flex items-center gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 min-h-[44px] min-w-[44px]"
                    >
                      <ChevronLeft className="w-4 h-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>

                    <div className="flex items-center gap-1">
                      {getPageNumbers().map((page) => (
                        <Button
                          key={page}
                          variant={currentPage === page ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageClick(page)}
                          className={
                            currentPage === page
                              ? "bg-amber-600 hover:bg-amber-700 text-white min-h-[44px] min-w-[44px]"
                              : "border-amber-300 text-amber-700 hover:bg-amber-50 min-h-[44px] min-w-[44px]"
                          }
                        >
                          {page}
                        </Button>
                      ))}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleNextPage}
                      disabled={currentPage === totalPages}
                      className="flex items-center gap-1 border-amber-300 text-amber-700 hover:bg-amber-50 disabled:opacity-50 min-h-[44px] min-w-[44px]"
                    >
                      <span className="hidden sm:inline">Next</span>
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="text-sm text-amber-700 text-center sm:text-right">
                    <div>
                      Page {currentPage} of {totalPages}
                    </div>
                    <div className="text-xs text-amber-600">
                      {filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"} total
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Summary Stats with Payment Status */}
              {orders.length > 0 && (
                <div className="space-y-4 mt-8 pt-6 border-t border-amber-200">
                  {/* Overall Stats */}
                  <div>
                    <h4 className="text-sm font-medium text-amber-800 mb-3">Overall Statistics</h4>
                    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-4">
                      <div className="text-center p-4 bg-white/90 rounded-lg border border-amber-200">
                        <div className="text-xl sm:text-2xl font-bold text-amber-800">{filteredOrders.length}</div>
                        <div className="text-xs sm:text-sm text-amber-600">
                          {filteredOrders.length < orders.length ? "Filtered Orders" : "Total Orders"}
                        </div>
                      </div>
                      <div className="text-center p-4 bg-white/90 rounded-lg border border-amber-200">
                        <div className="text-xl sm:text-2xl font-bold text-green-800">
                          {allFilteredStats.totalItems}
                        </div>
                        <div className="text-xs sm:text-sm text-green-600">Total Items</div>
                      </div>
                      <div className="text-center p-4 bg-white/90 rounded-lg border border-amber-200">
                        <div className="text-xl sm:text-2xl font-bold text-blue-800">
                          ${allFilteredStats.totalRevenue.toFixed(2)}
                        </div>
                        <div className="text-xs sm:text-sm text-blue-600">Total Revenue</div>
                      </div>
                      <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                        <div className="text-xl sm:text-2xl font-bold text-green-800 flex items-center justify-center gap-1">
                          🟢 {allFilteredStats.paidOrders}
                        </div>
                        <div className="text-xs sm:text-sm text-green-600">PAID Orders</div>
                      </div>
                      <div className="text-center p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="text-xl sm:text-2xl font-bold text-red-800 flex items-center justify-center gap-1">
                          🔴 {allFilteredStats.unpaidOrders}
                        </div>
                        <div className="text-xs sm:text-sm text-red-600">UNPAID Orders</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Navigation Footer - Always at bottom */}
        <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm mt-4 sm:mt-6 sticky bottom-0">
          <div className="p-4 sm:p-6 flex justify-center w-full">
            <div className="flex flex-wrap gap-0 w-full justify-between">
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none first:rounded-l-lg last:rounded-r-lg"
                onClick={() => router.push("/")}
              >
                <Plus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Order</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
                onClick={() => router.push("/receipt")}
              >
                <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Receipt</span>
              </Button>
              <Button
                variant="default"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-none"
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">History ({orders.length})</span>
                <span className="sm:hidden">({orders.length})</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
                onClick={() => router.push("/calendar")}
              >
                <CalendarIcon className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Calendar</span>
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none first:rounded-l-lg last:rounded-r-lg"
                onClick={() => router.push("/trends")}
              >
                <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">Trends</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
