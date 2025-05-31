"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
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
  Wifi,
  WifiOff,
  AlertCircle,
  Search,
  CalendarDaysIcon as CalendarDayIcon,
  User,
  DollarSign,
} from "lucide-react"
import { subscribeToOrders, type FirestoreOrder } from "@/lib/firestore"
import { useMediaQuery } from "@/hooks/use-media-query"

export default function CalendarPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<FirestoreOrder[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentDate, setCurrentDate] = useState(new Date())
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [viewMode, setViewMode] = useState<"Day" | "Week" | "Month" | "Year">("Month")
  const isMobile = useMediaQuery("(max-width: 768px)")

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

  // Filter orders based on search term
  const filteredOrdersByDate = useMemo(() => {
    if (!searchTerm) return ordersByDate

    const filtered: Record<string, FirestoreOrder[]> = {}
    Object.entries(ordersByDate).forEach(([date, orders]) => {
      const matchingOrders = orders.filter(
        (order) =>
          order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          order.items.some((item) => item.name.toLowerCase().includes(searchTerm.toLowerCase())),
      )
      if (matchingOrders.length > 0) {
        filtered[date] = matchingOrders
      }
    })
    return filtered
  }, [ordersByDate, searchTerm])

  // Calculate statistics for current period
  const currentPeriodStats = useMemo(() => {
    let periodOrders: FirestoreOrder[] = []
    const today = new Date()
    const year = currentDate.getFullYear()
    const month = currentDate.getMonth()
    const day = currentDate.getDate()

    switch (viewMode) {
      case "Day":
        periodOrders = orders.filter((order) => {
          const orderDate = new Date(order.deliveryDate + "T00:00:00")
          return orderDate.getFullYear() === year && orderDate.getMonth() === month && orderDate.getDate() === day
        })
        break
      case "Week":
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)

        periodOrders = orders.filter((order) => {
          const orderDate = new Date(order.deliveryDate + "T00:00:00")
          return orderDate >= startOfWeek && orderDate <= endOfWeek
        })
        break
      case "Month":
        periodOrders = orders.filter((order) => {
          const orderDate = new Date(order.deliveryDate + "T00:00:00")
          return orderDate.getFullYear() === year && orderDate.getMonth() === month
        })
        break
      case "Year":
        periodOrders = orders.filter((order) => {
          const orderDate = new Date(order.deliveryDate + "T00:00:00")
          return orderDate.getFullYear() === year
        })
        break
    }

    const totalOrders = periodOrders.length
    const totalRevenue = periodOrders.reduce((sum, order) => sum + order.finalTotal, 0)
    const totalItems = periodOrders.reduce((sum, order) => sum + order.items.length, 0)

    // Calculate active days
    const uniqueDates = new Set(periodOrders.map((order) => order.deliveryDate))
    const activeDays = uniqueDates.size

    return { totalOrders, totalRevenue, totalItems, activeDays }
  }, [orders, currentDate, viewMode])

  // Calendar helper functions
  const getDisplayTitle = () => {
    switch (viewMode) {
      case "Day":
        return currentDate.toLocaleDateString("en-US", {
          weekday: isMobile ? "short" : "long",
          year: "numeric",
          month: isMobile ? "short" : "long",
          day: "numeric",
        })
      case "Week":
        const startOfWeek = new Date(currentDate)
        startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
        const endOfWeek = new Date(startOfWeek)
        endOfWeek.setDate(startOfWeek.getDate() + 6)
        return `${startOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${endOfWeek.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
      case "Month":
        return currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })
      case "Year":
        return currentDate.getFullYear().toString()
    }
  }

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)
    const daysInMonth = lastDay.getDate()
    const startingDayOfWeek = firstDay.getDay()

    const days = []

    // Add days from previous month
    const prevMonth = new Date(year, month - 1, 0)
    const prevMonthDays = prevMonth.getDate()
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      days.push({
        day: prevMonthDays - i,
        isCurrentMonth: false,
        isPrevMonth: true,
        date: new Date(year, month - 1, prevMonthDays - i),
      })
    }

    // Add all days of current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        isPrevMonth: false,
        date: new Date(year, month, day),
      })
    }

    // Add days from next month to fill the grid
    const remainingCells = 42 - days.length // 6 rows × 7 days
    for (let day = 1; day <= remainingCells; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        isPrevMonth: false,
        date: new Date(year, month + 1, day),
      })
    }

    return days
  }

  const formatDateKey = (date: Date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const day = date.getDate()
    return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`
  }

  const isToday = (date: Date) => {
    const today = new Date()
    return (
      today.getFullYear() === date.getFullYear() &&
      today.getMonth() === date.getMonth() &&
      today.getDate() === date.getDate()
    )
  }

  const navigate = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev)
      switch (viewMode) {
        case "Day":
          newDate.setDate(prev.getDate() + (direction === "next" ? 1 : -1))
          break
        case "Week":
          newDate.setDate(prev.getDate() + (direction === "next" ? 7 : -7))
          break
        case "Month":
          newDate.setMonth(prev.getMonth() + (direction === "next" ? 1 : -1))
          break
        case "Year":
          newDate.setFullYear(prev.getFullYear() + (direction === "next" ? 1 : -1))
          break
      }
      return newDate
    })
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(null)
  }

  const handleDateClick = (date: Date) => {
    const dateKey = formatDateKey(date)
    setSelectedDate(dateKey)
  }

  const handleViewOrder = (order: FirestoreOrder) => {
    localStorage.setItem("currentOrder", JSON.stringify(order))
    router.push("/receipt")
  }

  const formatTime = (timeString: string) => {
    try {
      const [hours, minutes] = timeString.split(":").map(Number)
      if (isNaN(hours) || isNaN(minutes)) return timeString
      const period = hours >= 12 ? "PM" : "AM"
      const hour12 = hours % 12 || 12
      return `${hour12}:${minutes.toString().padStart(2, "0")} ${period}`
    } catch (e) {
      return timeString
    }
  }

  // Mobile-optimized Day View
  const renderMobileDayView = () => {
    const dateKey = formatDateKey(currentDate)
    const dayOrders = filteredOrdersByDate[dateKey] || []

    return (
      <div className="p-4">
        <div className="space-y-4">
          {dayOrders.length > 0 ? (
            dayOrders
              .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
              .map((order) => (
                <Card
                  key={order.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleViewOrder(order)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <User className="w-4 h-4 text-gray-500" />
                          <div className="font-medium text-gray-900">{order.customerName}</div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Clock className="w-3 h-3" />
                          {formatTime(order.deliveryTime)}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <DollarSign className="w-3 h-3" />${order.finalTotal.toFixed(2)} • {order.items.length} items
                        </div>
                      </div>
                      <Badge
                        className={`${
                          order.paymentStatus === "PAID" || order.isPaid
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {order.paymentStatus === "PAID" || order.isPaid ? "Paid" : "Unpaid"}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500 space-y-1">
                      {order.items.slice(0, 2).map((item, index) => (
                        <div key={index}>
                          {item.quantity}x {item.name} - ${(item.unitPrice * item.quantity).toFixed(2)}
                        </div>
                      ))}
                      {order.items.length > 2 && <div>+{order.items.length - 2} more items...</div>}
                    </div>
                  </CardContent>
                </Card>
              ))
          ) : (
            <div className="text-center text-gray-500 py-12">
              <CalendarDayIcon className="w-16 h-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg">No orders for this day</p>
              {searchTerm && <p className="text-sm mt-2">Try adjusting your search terms</p>}
            </div>
          )}
        </div>
      </div>
    )
  }

  // Mobile-optimized Week View
  const renderMobileWeekView = () => {
    const startOfWeek = new Date(currentDate)
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())

    const weekDays = []
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek)
      day.setDate(startOfWeek.getDate() + i)
      weekDays.push(day)
    }

    return (
      <div className="p-4">
        <div className="space-y-3">
          {weekDays.map((day, index) => {
            const dateKey = formatDateKey(day)
            const dayOrders = filteredOrdersByDate[dateKey] || []
            const isCurrentDay = isToday(day)

            return (
              <Card key={index} className={`${isCurrentDay ? "border-red-300 bg-red-50" : ""}`}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <span className={`${isCurrentDay ? "text-red-700 font-bold" : "text-gray-700"}`}>
                      {day.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
                      {isCurrentDay && " (Today)"}
                    </span>
                    {dayOrders.length > 0 && <Badge className="bg-amber-100 text-amber-800">{dayOrders.length}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0">
                  {dayOrders.length > 0 ? (
                    <div className="space-y-2">
                      {dayOrders.slice(0, 3).map((order, orderIndex) => (
                        <div
                          key={orderIndex}
                          className={`text-xs p-2 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
                            order.paymentStatus === "PAID" || order.isPaid ? "bg-green-500" : "bg-red-500"
                          }`}
                          onClick={() => handleViewOrder(order)}
                        >
                          <div className="font-medium">
                            {formatTime(order.deliveryTime)} - {order.customerName}
                          </div>
                          <div className="opacity-90">
                            {order.items.length} items • ${order.finalTotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                      {dayOrders.length > 3 && (
                        <div className="text-xs text-gray-500 text-center py-1">
                          +{dayOrders.length - 3} more orders
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-500 text-center py-2">No orders</div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>
    )
  }

  // Mobile-optimized Month View
  const renderMobileMonthView = () => {
    const days = getDaysInMonth(currentDate)

    return (
      <div className="p-4">
        {/* Day Headers */}
        <div className="grid grid-cols-7 mb-2">
          {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
            <div key={day} className="p-2 text-center text-xs font-medium text-gray-600">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((dayInfo, index) => {
            const dateKey = formatDateKey(dayInfo.date)
            const dayOrders = filteredOrdersByDate[dateKey] || []
            const isCurrentDay = isToday(dayInfo.date)
            const isSelected = selectedDate === dateKey

            return (
              <div
                key={index}
                className={`
                  min-h-[60px] border border-gray-200 p-1 cursor-pointer hover:bg-gray-50 transition-colors rounded
                  ${isSelected ? "bg-blue-50 border-blue-300" : ""}
                  ${!dayInfo.isCurrentMonth ? "bg-gray-50 opacity-50" : "bg-white"}
                  ${isCurrentDay ? "border-red-300 bg-red-50" : ""}
                `}
                onClick={() => handleDateClick(dayInfo.date)}
              >
                {/* Date Number */}
                <div className="flex justify-between items-start mb-1">
                  <span
                    className={`
                      text-xs font-medium
                      ${!dayInfo.isCurrentMonth ? "text-gray-400" : "text-gray-900"}
                      ${isCurrentDay ? "bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs" : ""}
                    `}
                  >
                    {dayInfo.day}
                  </span>
                  {dayOrders.length > 0 && (
                    <div className="bg-amber-500 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs">
                      {dayOrders.length}
                    </div>
                  )}
                </div>

                {/* Order indicators */}
                {dayOrders.length > 0 && (
                  <div className="space-y-0.5">
                    {dayOrders.slice(0, 2).map((order, orderIndex) => (
                      <div
                        key={orderIndex}
                        className={`h-1 rounded ${
                          order.paymentStatus === "PAID" || order.isPaid ? "bg-green-400" : "bg-red-400"
                        }`}
                      />
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {/* Selected Date Details */}
        {selectedDate && (
          <div className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">
                  Orders for{" "}
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {filteredOrdersByDate[selectedDate]?.length > 0 ? (
                  <div className="space-y-2">
                    {filteredOrdersByDate[selectedDate]
                      .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
                      .map((order) => (
                        <div
                          key={order.id}
                          className="p-2 border border-gray-200 rounded cursor-pointer hover:bg-gray-50"
                          onClick={() => handleViewOrder(order)}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <div className="font-medium text-sm">{order.customerName}</div>
                            <Badge
                              className={`text-xs ${
                                order.paymentStatus === "PAID" || order.isPaid
                                  ? "bg-green-100 text-green-800"
                                  : "bg-red-100 text-red-800"
                              }`}
                            >
                              {order.paymentStatus === "PAID" || order.isPaid ? "Paid" : "Unpaid"}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-600 flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            {formatTime(order.deliveryTime)} • {order.items.length} items • $
                            {order.finalTotal.toFixed(2)}
                          </div>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4">
                    <p className="text-sm">No orders for this date</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    )
  }

  // Mobile-optimized Year View
  const renderMobileYearView = () => {
    const months = []
    for (let month = 0; month < 12; month++) {
      const monthDate = new Date(currentDate.getFullYear(), month, 1)
      const monthOrders = orders.filter((order) => {
        const orderDate = new Date(order.deliveryDate + "T00:00:00")
        return orderDate.getFullYear() === currentDate.getFullYear() && orderDate.getMonth() === month
      })

      months.push({
        date: monthDate,
        orders: monthOrders,
        revenue: monthOrders.reduce((sum, order) => sum + order.finalTotal, 0),
      })
    }

    return (
      <div className="p-4">
        <div className="grid grid-cols-2 gap-4">
          {months.map((month, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setCurrentDate(month.date)
                setViewMode("Month")
              }}
            >
              <CardContent className="p-4 text-center">
                <div className="text-lg font-semibold text-gray-900 mb-2">
                  {month.date.toLocaleDateString("en-US", { month: "short" })}
                </div>
                <div className="text-sm text-gray-600 mb-1">{month.orders.length} orders</div>
                <div className="text-sm font-medium text-green-600">${month.revenue.toFixed(0)}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col relative">
      {/* Background with 90% transparency */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/images/pastry-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          opacity: 0.1, // 90% transparency
        }}
      />

      {/* Content with proper z-index */}
      <div className="relative z-10 flex-grow">
        {/* Connection Status & Error Messages */}
        {error && (
          <div className="mx-4 pt-4 pb-2">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 text-sm">
                <strong>Firebase Error:</strong> {error}
              </span>
            </div>
          </div>
        )}

        {/* Mobile Header */}
        <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200 m-4 mb-2">
          <CardHeader className="bg-amber-100/95 border-b border-amber-200 pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-amber-800 text-lg">
                <CalendarIcon className="w-5 h-5" />
                Calendar
              </CardTitle>
              <Badge
                className={`text-xs flex items-center gap-1 ${
                  isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                }`}
              >
                {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                {isConnected ? "Live" : "Offline"}
              </Badge>
            </div>

            {/* Mobile Search */}
            <div className="relative mt-4">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Search orders..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white border-amber-300"
              />
            </div>

            {/* Mobile View Mode Buttons */}
            <div className="flex bg-white rounded-lg p-1 mt-4">
              {(["Day", "Week", "Month", "Year"] as const).map((mode) => (
                <Button
                  key={mode}
                  variant={viewMode === mode ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setViewMode(mode)}
                  className={`flex-1 text-xs py-2 ${
                    viewMode === mode
                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                      : "text-amber-700 hover:bg-amber-50"
                  }`}
                >
                  {mode}
                </Button>
              ))}
            </div>
          </CardHeader>
        </Card>

        {/* Mobile Statistics */}
        <Card className="bg-white/95 backdrop-blur-sm mx-4 mb-4">
          <CardContent className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center">
                <div className="text-xl font-bold text-orange-600">{currentPeriodStats.totalOrders}</div>
                <div className="text-xs text-orange-600 font-medium">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-green-600">${currentPeriodStats.totalRevenue.toFixed(0)}</div>
                <div className="text-xs text-green-600 font-medium">Revenue</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Navigation */}
        <Card className="bg-white/95 backdrop-blur-sm mx-4 mb-4">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("prev")}
                className="text-amber-700 hover:bg-amber-50 p-2"
              >
                <ChevronLeft className="w-5 h-5" />
              </Button>

              <div className="text-center flex-1">
                <h2 className="text-lg font-semibold text-gray-900">{getDisplayTitle()}</h2>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("next")}
                className="text-amber-700 hover:bg-amber-50 p-2"
              >
                <ChevronRight className="w-5 h-5" />
              </Button>
            </div>

            <div className="flex justify-center mt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={goToToday}
                className="text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                Today
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Mobile Content */}
        <Card className="bg-white/95 backdrop-blur-sm mx-4 mb-4">
          {viewMode === "Day" && renderMobileDayView()}
          {viewMode === "Week" && renderMobileWeekView()}
          {viewMode === "Month" && renderMobileMonthView()}
          {viewMode === "Year" && renderMobileYearView()}
        </Card>
      </div>

      {/* Navigation Footer */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm mt-4 sticky bottom-0">
        <div className="p-4 flex justify-center w-full">
          <div className="flex flex-wrap gap-0 w-full justify-between">
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none first:rounded-l-lg"
              onClick={() => router.push("/")}
            >
              <Plus className="w-3 h-3" />
              <span className="hidden sm:inline">Order</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
              onClick={() => router.push("/receipt")}
            >
              <Receipt className="w-3 h-3" />
              <span className="hidden sm:inline">Receipt</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
              onClick={() => router.push("/history")}
            >
              <History className="w-3 h-3" />
              <span className="hidden sm:inline">History</span>
            </Button>
            <Button
              variant="default"
              className="flex-1 flex items-center justify-center gap-2 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-none"
            >
              <CalendarIcon className="w-3 h-3" />
              <span className="hidden sm:inline">Calendar</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 flex items-center justify-center gap-2 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none last:rounded-r-lg"
              onClick={() => router.push("/trends")}
            >
              <TrendingUp className="w-3 h-3" />
              <span className="hidden sm:inline">Trends</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
