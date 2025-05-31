"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useRouter } from "next/navigation"
import {
  Plus,
  Receipt,
  History,
  TrendingUp,
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Clock,
  User,
  Package,
  Eye,
  Wifi,
  WifiOff,
  AlertCircle,
  X,
} from "lucide-react"
import { subscribeToOrders, type FirestoreOrder } from "@/lib/firestore"

export default function CalendarPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<FirestoreOrder[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showOrderDetails, setShowOrderDetails] = useState(false)

  useEffect(() => {
    console.log("🔄 Setting up Firestore real-time listener for calendar...")

    const unsubscribe = subscribeToOrders(
      (firestoreOrders) => {
        console.log("📡 Received orders update for calendar:", firestoreOrders.length, "orders")
        setOrders(firestoreOrders)
        setIsConnected(true)
        setError(null)
      },
      (error) => {
        console.error("❌ Firestore connection error in calendar:", error)
        setError(error.message)
        setIsConnected(false)
      },
    )

    return () => {
      console.log("🔌 Cleaning up Firestore listener for calendar")
      unsubscribe()
    }
  }, [])

  // Group orders by date
  const ordersByDate = useMemo(() => {
    const grouped: Record<string, FirestoreOrder[]> = {}
    orders.forEach((order) => {
      const date = order.deliveryDate // Format: YYYY-MM-DD
      if (!grouped[date]) {
        grouped[date] = []
      }
      grouped[date].push(order)
    })
    return grouped
  }, [orders])

  // Get orders for selected date
  const selectedDateOrders = selectedDate ? ordersByDate[selectedDate] || [] : []

  // Calendar helper functions
  const getMonthName = (date: Date) => {
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" })
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startingDayOfWeek; i++) {
      days.push(null)
    }

    // Add all days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push(day)
    }

    return days
  }

  const formatDateKey = (year: number, month: number, day: number) => {
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const isToday = (year: number, month: number, day: number) => {
    const today = new Date()
    return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day
  }

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      if (direction === "prev") {
        newDate.setMonth(prev.getMonth() - 1)
      } else {
        newDate.setMonth(prev.getMonth() + 1)
      }
      return newDate
    })
    setSelectedDate(null)
    setShowOrderDetails(false)
  }

  const handleDateClick = (day: number) => {
    const dateKey = formatDateKey(currentDate.getFullYear(), currentDate.getMonth(), day)
    const hasOrders = ordersByDate[dateKey] && ordersByDate[dateKey].length > 0

    if (hasOrders) {
      setSelectedDate(dateKey)
      setShowOrderDetails(true)
    }
  }

  const handleViewOrder = (order: FirestoreOrder) => {
    localStorage.setItem("currentOrder", JSON.stringify(order))
    router.push("/receipt")
  }

  const days = getDaysInMonth(currentDate)
  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  // Calculate statistics for current month
  const currentMonthStats = useMemo(() => {
    const monthOrders = orders.filter((order) => {
      const orderDate = new Date(order.deliveryDate + "T00:00:00")
      return orderDate.getFullYear() === year && orderDate.getMonth() === month
    })

    const totalOrders = monthOrders.length
    const totalRevenue = monthOrders.reduce((sum, order) => sum + order.finalTotal, 0)
    const totalItems = monthOrders.reduce((sum, order) => sum + order.items.length, 0)
    const daysWithOrders = Object.keys(ordersByDate).filter((date) => {
      const orderDate = new Date(date + "T00:00:00")
      return orderDate.getFullYear() === year && orderDate.getMonth() === month
    }).length

    return { totalOrders, totalRevenue, totalItems, daysWithOrders }
  }, [orders, ordersByDate, year, month])

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
      <div className="max-w-7xl mx-auto flex-grow w-full">
        {/* Connection Status & Error Messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-red-800 text-sm">
              <strong>Firebase Error:</strong> {error}
            </span>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6">
          {/* Calendar Section */}
          <div className={`${showOrderDetails ? "lg:col-span-3" : "lg:col-span-4"} transition-all duration-300`}>
            <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200">
              <CardHeader className="bg-amber-100/95 border-b border-amber-200">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <CardTitle className="flex items-center gap-2 text-amber-800">
                    <CalendarIcon className="w-5 h-5" />
                    Order Calendar
                    <Badge
                      className={`text-xs flex items-center gap-1 ${
                        isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {isConnected ? "Live Data" : "Disconnected"}
                    </Badge>
                  </CardTitle>

                  {/* Month Navigation */}
                  <div className="flex items-center gap-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth("prev")}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <h2 className="text-lg font-semibold text-amber-800 min-w-[200px] text-center">
                      {getMonthName(currentDate)}
                    </h2>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigateMonth("next")}
                      className="border-amber-300 text-amber-700 hover:bg-amber-50"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="p-4 sm:p-6">
                {/* Month Statistics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
                  <div className="text-center p-3 bg-white/90 rounded-lg border border-amber-200">
                    <div className="text-lg sm:text-xl font-bold text-amber-800">{currentMonthStats.totalOrders}</div>
                    <div className="text-xs sm:text-sm text-amber-600">Orders</div>
                  </div>
                  <div className="text-center p-3 bg-white/90 rounded-lg border border-amber-200">
                    <div className="text-lg sm:text-xl font-bold text-green-800">
                      ${currentMonthStats.totalRevenue.toFixed(0)}
                    </div>
                    <div className="text-xs sm:text-sm text-green-600">Revenue</div>
                  </div>
                  <div className="text-center p-3 bg-white/90 rounded-lg border border-amber-200">
                    <div className="text-lg sm:text-xl font-bold text-blue-800">{currentMonthStats.totalItems}</div>
                    <div className="text-xs sm:text-sm text-blue-600">Items</div>
                  </div>
                  <div className="text-center p-3 bg-white/90 rounded-lg border border-amber-200">
                    <div className="text-lg sm:text-xl font-bold text-purple-800">
                      {currentMonthStats.daysWithOrders}
                    </div>
                    <div className="text-xs sm:text-sm text-purple-600">Active Days</div>
                  </div>
                </div>

                {/* Calendar Grid */}
                <div className="bg-white/90 rounded-lg border border-amber-200 p-4">
                  {/* Day Headers */}
                  <div className="grid grid-cols-7 gap-1 mb-4">
                    {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-amber-700 p-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Calendar Days */}
                  <div className="grid grid-cols-7 gap-1">
                    {days.map((day, index) => {
                      if (day === null) {
                        return <div key={index} className="p-2 h-12 sm:h-16"></div>
                      }

                      const dateKey = formatDateKey(year, month, day)
                      const dayOrders = ordersByDate[dateKey] || []
                      const hasOrders = dayOrders.length > 0
                      const isCurrentDay = isToday(year, month, day)
                      const isSelected = selectedDate === dateKey

                      return (
                        <button
                          key={day}
                          onClick={() => handleDateClick(day)}
                          className={`
                            relative p-2 h-12 sm:h-16 rounded-lg border transition-all duration-200 text-sm sm:text-base
                            ${
                              hasOrders
                                ? isSelected
                                  ? "bg-amber-600 text-white border-amber-700 shadow-lg transform scale-105"
                                  : "bg-amber-100 text-amber-800 border-amber-300 hover:bg-amber-200 hover:shadow-md cursor-pointer"
                                : "bg-gray-50 text-gray-600 border-gray-200 hover:bg-gray-100"
                            }
                            ${isCurrentDay ? "ring-2 ring-blue-400 ring-opacity-50" : ""}
                          `}
                          disabled={!hasOrders}
                        >
                          <div className="flex flex-col items-center justify-center h-full">
                            <span className={`font-medium ${isCurrentDay ? "font-bold" : ""}`}>{day}</span>
                            {hasOrders && (
                              <div className="flex items-center gap-1 mt-1">
                                <div
                                  className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-white" : "bg-amber-600"}`}
                                />
                                {dayOrders.length > 1 && (
                                  <span className={`text-xs font-bold ${isSelected ? "text-white" : "text-amber-700"}`}>
                                    {dayOrders.length}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs sm:text-sm text-amber-700">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-100 border border-amber-300 rounded"></div>
                    <span>Has Orders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-blue-100 border-2 border-blue-400 rounded"></div>
                    <span>Today</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-amber-600 rounded"></div>
                    <span>Selected</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Details Sidebar */}
          {showOrderDetails && selectedDate && (
            <div className="lg:col-span-1">
              <Card className="bg-white/95 backdrop-blur-sm border-amber-200 sticky top-4">
                <CardHeader className="bg-amber-100/95 border-b border-amber-200">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-amber-800 text-base sm:text-lg">
                      Orders for{" "}
                      {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setShowOrderDetails(false)
                        setSelectedDate(null)
                      }}
                      className="text-amber-700 hover:bg-amber-50"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-amber-600">
                    {selectedDateOrders.length} {selectedDateOrders.length === 1 ? "order" : "orders"}
                  </div>
                </CardHeader>

                <CardContent className="p-4 max-h-[600px] overflow-y-auto">
                  {selectedDateOrders.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p className="text-sm">No orders for this date</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateOrders
                        .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
                        .map((order) => (
                          <div
                            key={order.id}
                            className="p-3 bg-amber-50 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <User className="w-3 h-3 text-amber-600" />
                                  <span className="font-medium text-amber-800 text-sm">{order.customerName}</span>
                                </div>
                                <div className="flex items-center gap-2 mb-1">
                                  <Clock className="w-3 h-3 text-amber-600" />
                                  <span className="text-xs text-amber-700">{order.deliveryTime}</span>
                                  {order.isDelivery && (
                                    <Badge className="bg-blue-100 text-blue-800 text-xs">Delivery</Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Package className="w-3 h-3 text-amber-600" />
                                  <span className="text-xs text-amber-700">
                                    {order.items.length} {order.items.length === 1 ? "item" : "items"}
                                  </span>
                                  <span className="text-xs font-medium text-amber-800">
                                    ${order.finalTotal.toFixed(2)}
                                  </span>
                                </div>
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewOrder(order)}
                                className="text-amber-700 hover:bg-amber-200 p-1"
                              >
                                <Eye className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Payment Status */}
                            <div className="flex items-center justify-between">
                              <Badge
                                className={`text-xs ${
                                  order.paymentStatus === "PAID" || order.isPaid
                                    ? "bg-green-100 text-green-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {order.paymentStatus === "PAID" || order.isPaid ? "🟢 PAID" : "🔴 UNPAID"}
                              </Badge>
                              <span className="text-xs text-gray-500">#{order.receiptId}</span>
                            </div>

                            {/* Order Items Preview */}
                            <div className="mt-2 text-xs text-amber-600">
                              {order.items.slice(0, 2).map((item, index) => (
                                <div key={index}>
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                              {order.items.length > 2 && (
                                <div className="text-amber-500">+{order.items.length - 2} more...</div>
                              )}
                            </div>
                          </div>
                        ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </div>
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
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
              onClick={() => router.push("/history")}
            >
              <History className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant="default"
              className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-none"
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
  )
}
