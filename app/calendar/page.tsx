"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import {
  LogOut,
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
} from "lucide-react"
import { subscribeToOrders, type FirestoreOrder } from "@/lib/firestore"
import { useMediaQuery } from "@/hooks/use-media-query"
import ProtectedRoute from "@/components/protected-route"
import { getAuth, signOut } from "firebase/auth"

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

  const [showDayModal, setShowDayModal] = useState(false)
  const [selectedDayOrders, setSelectedDayOrders] = useState<FirestoreOrder[]>([])
  const [selectedDayDate, setSelectedDayDate] = useState<string>("")

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
          weekday: "long",
          year: "numeric",
          month: "long",
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

    // Show day order summary
    const dayOrders = filteredOrdersByDate[dateKey] || []
    setSelectedDayOrders(dayOrders)
    setSelectedDayDate(
      date.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    )
    setShowDayModal(true)
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

  const days = getDaysInMonth(currentDate)

  const renderDayView = () => {
    const dateKey = formatDateKey(currentDate)
    const dayOrders = filteredOrdersByDate[dateKey] || []

    return (
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-semibold text-gray-900 mb-6">
            {currentDate.toLocaleDateString("en-US", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </h3>

          {dayOrders.length > 0 ? (
            <div className="space-y-4">
              {dayOrders
                .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
                .map((order) => (
                  <Card
                    key={order.id}
                    className="hover:shadow-md transition-shadow cursor-pointer"
                    onClick={() => handleViewOrder(order)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-2">
                            <div className="text-lg font-medium text-gray-900">{order.customerName}</div>
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
                          <div className="text-gray-600 flex items-center gap-1 mb-2">
                            <Clock className="w-4 h-4" />
                            {formatTime(order.deliveryTime)}
                          </div>
                          <div className="text-gray-600 mb-4">
                            {order.items.length} {order.items.length === 1 ? "item" : "items"} • $
                            {order.finalTotal.toFixed(2)}
                          </div>
                          <div className="text-sm text-gray-500">
                            {order.items.map((item, index) => (
                              <div key={index}>
                                {item.quantity}x {item.name} - ${(item.price * item.quantity).toFixed(2)}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </div>
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

  const renderWeekView = () => {
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
        <div className="grid grid-cols-7 gap-4">
          {weekDays.map((day, index) => {
            const dateKey = formatDateKey(day)
            const dayOrders = filteredOrdersByDate[dateKey] || []
            const isCurrentDay = isToday(day)

            return (
              <div key={index} className="min-h-[300px] border border-gray-200 rounded-lg p-3">
                <div className="text-center mb-3">
                  <div className="text-sm font-medium text-gray-600">
                    {day.toLocaleDateString("en-US", { weekday: "short" })}
                  </div>
                  <div
                    className={`text-lg font-semibold ${
                      isCurrentDay
                        ? "bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center mx-auto"
                        : "text-gray-900"
                    }`}
                  >
                    {day.getDate()}
                  </div>
                </div>

                <div className="space-y-2">
                  {dayOrders.slice(0, 4).map((order, orderIndex) => (
                    <div
                      key={orderIndex}
                      className={`text-xs p-2 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
                        order.paymentStatus === "PAID" || order.isPaid ? "bg-green-500" : "bg-red-500"
                      }`}
                      onClick={() => handleViewOrder(order)}
                    >
                      <div className="font-medium truncate">{formatTime(order.deliveryTime)}</div>
                      <div className="truncate">{order.customerName}</div>
                    </div>
                  ))}
                  {dayOrders.length > 4 && (
                    <div className="text-xs text-gray-500 text-center">+{dayOrders.length - 4} more</div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const renderYearView = () => {
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
        paidOrders: monthOrders.filter((order) => order.paymentStatus === "PAID" || order.isPaid).length,
        unpaidOrders: monthOrders.filter((order) => !(order.paymentStatus === "PAID" || order.isPaid)).length,
      })
    }

    return (
      <div className="p-4 md:p-8">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {months.map((month, index) => (
            <Card
              key={index}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => {
                setCurrentDate(month.date)
                setViewMode("Month")
              }}
            >
              <CardContent className="p-3 md:p-4 text-center">
                <div className="text-base md:text-lg font-semibold text-gray-900 mb-2">
                  {month.date.toLocaleDateString("en-US", { month: "short" })}
                </div>
                <div className="text-xs md:text-sm text-gray-600 mb-1">{month.orders.length} orders</div>
                <div className="text-xs md:text-sm font-medium text-green-600 mb-2">${month.revenue.toFixed(0)}</div>

                {/* Order status indicators */}
                {month.orders.length > 0 && (
                  <div className="flex justify-center gap-1">
                    {month.paidOrders > 0 && (
                      <div className="w-2 h-2 bg-green-500 rounded-full" title={`${month.paidOrders} paid`}></div>
                    )}
                    {month.unpaidOrders > 0 && (
                      <div className="w-2 h-2 bg-red-500 rounded-full" title={`${month.unpaidOrders} unpaid`}></div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Day Order Summary Modal
  const DayOrderSummaryModal = () => {
    if (!showDayModal) return null

    return (
      <>
        {/* Backdrop */}
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowDayModal(false)} />

        {/* Modal Content */}
        <div
          className={`fixed z-50 ${
            isMobile
              ? "bottom-0 left-0 right-0 max-h-[70vh] rounded-t-lg"
              : "top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-full max-w-md rounded-lg"
          } bg-white shadow-xl`}
        >
          {/* Compact Header */}
          <div className="p-3 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-gray-900 truncate">{selectedDayDate}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowDayModal(false)}
                className="text-gray-500 hover:text-gray-700 p-1 h-8 w-8"
              >
                ✕
              </Button>
            </div>
          </div>

          {/* Compact Content */}
          <div className="p-3 max-h-80 overflow-y-auto">
            {selectedDayOrders.length > 0 ? (
              <div className="space-y-2">
                {selectedDayOrders
                  .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
                  .map((order) => (
                    <div
                      key={order.id}
                      className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-1">
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-gray-900 text-sm truncate">{order.customerName}</div>
                          <div className="text-gray-600 flex items-center gap-1 text-xs">
                            <Clock className="w-3 h-3" />
                            {formatTime(order.deliveryTime)}
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-medium text-gray-900 text-sm">${order.finalTotal.toFixed(2)}</div>
                          <Badge
                            className={`text-xs ${
                              order.paymentStatus === "PAID" || order.isPaid
                                ? "bg-green-100 text-green-800"
                                : "bg-red-100 text-red-800"
                            }`}
                          >
                            {order.paymentStatus === "PAID" || order.isPaid ? "PAID" : "UNPAID"}
                          </Badge>
                        </div>
                      </div>
                      <div className="text-xs text-gray-500 mb-2">
                        {order.items.length} {order.items.length === 1 ? "item" : "items"}
                        {order.items.length <= 2 && (
                          <span> • {order.items.map((item) => `${item.quantity}x ${item.name}`).join(", ")}</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-8"
                        onClick={() => {
                          handleViewOrder(order)
                          setShowDayModal(false)
                        }}
                      >
                        View Receipt
                      </Button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-6">
                <CalendarDayIcon className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No orders for this day</p>
              </div>
            )}
          </div>
        </div>
      </>
    )
  }

  // Mobile version - compact and touch-friendly
  if (isMobile) {
    return (
      <ProtectedRoute>
        {/* Sign Out Button - Top Right */}
        <div className="fixed top-2 right-2 z-50">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const auth = getAuth()
              signOut(auth).then(() => {
                router.push("/login")
              })
            }}
            className="bg-white hover:bg-gray-100 text-amber-700 border-amber-300 shadow-sm text-xs px-2 py-1"
          >
            <LogOut className="w-3 h-3 mr-1" />
            Out
          </Button>
        </div>

        <div className="min-h-screen bg-gray-50">
          <div className="max-w-full mx-auto bg-white min-h-screen relative z-10">
            {/* Compact Statistics Bar */}
            <div className="relative z-20 bg-gradient-to-r from-amber-50 to-orange-50 border-b border-gray-200 p-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="text-center bg-white rounded-lg p-2 shadow-sm">
                  <div className="text-lg font-bold text-orange-600">{currentPeriodStats.totalOrders}</div>
                  <div className="text-xs text-orange-600 font-medium">Orders</div>
                </div>
                <div className="text-center bg-white rounded-lg p-2 shadow-sm">
                  <div className="text-lg font-bold text-green-600">${currentPeriodStats.totalRevenue.toFixed(0)}</div>
                  <div className="text-xs text-green-600 font-medium">Revenue</div>
                </div>
              </div>
            </div>

            {/* Compact Header */}
            <div className="relative z-20 border-b border-gray-200 bg-white p-2">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-lg font-semibold text-gray-900">Calendar</h1>

                {/* Connection Status */}
                <Badge
                  className={`text-xs flex items-center gap-1 ${
                    isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? "Live" : "Off"}
                </Badge>
              </div>

              {/* View Mode Buttons - Compact */}
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5 mb-2">
                {(["Day", "Week", "Month", "Year"] as const).map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode(mode)}
                    className={`flex-1 text-xs px-2 py-1.5 h-11 min-w-[44px] min-h-[44px] flex items-center justify-center ${
                      viewMode === mode
                        ? "bg-white shadow-sm text-gray-900 font-semibold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                    }`}
                  >
                    {mode}
                  </Button>
                ))}
              </div>

              {/* Search - Compact */}
              <div className="relative">
                <Search className="w-3 h-3 absolute left-2 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 h-8 text-xs border-gray-300"
                />
              </div>
            </div>

            {/* Compact Period Navigation */}
            <div className="relative z-20 border-b border-gray-200 bg-white p-2">
              <div className="flex items-center justify-between">
                <h2 className="text-base font-medium text-gray-900 flex-1 truncate">{getDisplayTitle()}</h2>
                <div className="flex items-center gap-1 ml-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("prev")}
                    className="text-gray-600 hover:text-gray-900 p-1 h-8 w-8"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToToday}
                    className="text-gray-700 border-gray-300 hover:bg-gray-50 px-2 h-8 text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("next")}
                    className="text-gray-600 hover:text-gray-900 p-1 h-8 w-8"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Content Area - Compact */}
            <div className="relative z-20 pb-16">
              {viewMode === "Day" && (
                <div className="p-2">
                  <div className="max-w-full mx-auto">
                    {(() => {
                      const dateKey = formatDateKey(currentDate)
                      const dayOrders = filteredOrdersByDate[dateKey] || []

                      return dayOrders.length > 0 ? (
                        <div className="space-y-2">
                          {dayOrders
                            .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
                            .map((order) => (
                              <Card
                                key={order.id}
                                className="hover:shadow-md transition-shadow cursor-pointer"
                                onClick={() => handleViewOrder(order)}
                              >
                                <CardContent className="p-3">
                                  <div className="flex items-start justify-between">
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        <div className="text-sm font-medium text-gray-900 truncate">
                                          {order.customerName}
                                        </div>
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
                                      <div className="text-xs text-gray-600 flex items-center gap-1 mb-1">
                                        <Clock className="w-3 h-3" />
                                        {formatTime(order.deliveryTime)}
                                      </div>
                                      <div className="text-xs text-gray-600 mb-2">
                                        {order.items.length} items • ${order.finalTotal.toFixed(2)}
                                      </div>
                                      <div className="text-xs text-gray-500">
                                        {order.items.slice(0, 2).map((item, index) => (
                                          <div key={index} className="truncate">
                                            {item.quantity}x {item.name}
                                          </div>
                                        ))}
                                        {order.items.length > 2 && <div>+{order.items.length - 2} more</div>}
                                      </div>
                                    </div>
                                  </div>
                                </CardContent>
                              </Card>
                            ))}
                        </div>
                      ) : (
                        <div className="text-center text-gray-500 py-8">
                          <CalendarDayIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                          <p className="text-sm">No orders today</p>
                        </div>
                      )
                    })()}
                  </div>
                </div>
              )}

              {viewMode === "Week" && (
                <div className="p-1">
                  <div className="grid grid-cols-7 gap-1">
                    {(() => {
                      const startOfWeek = new Date(currentDate)
                      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
                      const weekDays = []
                      for (let i = 0; i < 7; i++) {
                        const day = new Date(startOfWeek)
                        day.setDate(startOfWeek.getDate() + i)
                        weekDays.push(day)
                      }

                      return weekDays.map((day, index) => {
                        const dateKey = formatDateKey(day)
                        const dayOrders = filteredOrdersByDate[dateKey] || []
                        const isCurrentDay = isToday(day)

                        return (
                          <div key={index} className="min-h-[120px] border border-gray-200 rounded p-1">
                            <div className="text-center mb-1">
                              <div className="text-xs font-medium text-gray-600">
                                {day.toLocaleDateString("en-US", { weekday: "short" })}
                              </div>
                              <div
                                className={`text-sm font-semibold ${
                                  isCurrentDay
                                    ? "bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center mx-auto text-xs"
                                    : "text-gray-900"
                                }`}
                              >
                                {day.getDate()}
                              </div>
                            </div>

                            <div className="space-y-1">
                              {dayOrders.slice(0, 3).map((order, orderIndex) => (
                                <div
                                  key={orderIndex}
                                  className={`text-xs p-1 rounded text-white cursor-pointer hover:opacity-80 transition-opacity ${
                                    order.paymentStatus === "PAID" || order.isPaid ? "bg-green-500" : "bg-red-500"
                                  }`}
                                  onClick={() => handleViewOrder(order)}
                                >
                                  <div className="font-medium truncate text-xs">{formatTime(order.deliveryTime)}</div>
                                  <div className="truncate text-xs">{order.customerName}</div>
                                </div>
                              ))}
                              {dayOrders.length > 3 && (
                                <div className="text-xs text-gray-500 text-center">+{dayOrders.length - 3}</div>
                              )}
                            </div>
                          </div>
                        )
                      })
                    })()}
                  </div>
                </div>
              )}

              {viewMode === "Year" && (
                <div className="p-2">
                  <div className="grid grid-cols-3 gap-2">
                    {(() => {
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

                      return months.map((month, index) => (
                        <Card
                          key={index}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => {
                            setCurrentDate(month.date)
                            setViewMode("Month")
                          }}
                        >
                          <CardContent className="p-2 text-center">
                            <div className="text-sm font-semibold text-gray-900 mb-1">
                              {month.date.toLocaleDateString("en-US", { month: "short" })}
                            </div>
                            <div className="text-xs text-gray-600">{month.orders.length} orders</div>
                            <div className="text-xs font-medium text-green-600">${month.revenue.toFixed(0)}</div>
                          </CardContent>
                        </Card>
                      ))
                    })()}
                  </div>
                </div>
              )}

              {viewMode === "Month" && (
                <div className="p-1">
                  {/* Compact Day Headers */}
                  <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
                    {["S", "M", "T", "W", "T", "F", "S"].map((day) => (
                      <div
                        key={day}
                        className="p-1 text-center text-xs font-semibold text-gray-700 border-r border-gray-200 last:border-r-0 h-8 flex items-center justify-center"
                      >
                        {day}
                      </div>
                    ))}
                  </div>

                  {/* Compact Calendar Days */}
                  <div className="grid grid-cols-7 border-l border-gray-200">
                    {days.map((dayInfo, index) => {
                      const dateKey = formatDateKey(dayInfo.date)
                      const dayOrders = filteredOrdersByDate[dateKey] || []
                      const isCurrentDay = isToday(dayInfo.date)
                      const isSelected = selectedDate === dateKey

                      return (
                        <div
                          key={index}
                          className={`
                            min-h-[80px] border-r border-b border-gray-200 p-1 cursor-pointer hover:bg-gray-50 transition-colors
                            ${isSelected ? "bg-blue-50 border-blue-200" : ""}
                            ${!dayInfo.isCurrentMonth ? "bg-gray-50" : "bg-white"}
                          `}
                          onClick={() => handleDateClick(dayInfo.date)}
                        >
                          {/* Compact Date Number */}
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
                              <Badge className="bg-amber-100 text-amber-800 text-xs px-1 py-0 h-4 min-w-[16px] flex items-center justify-center">
                                {dayOrders.length}
                              </Badge>
                            )}
                          </div>

                          {/* Compact Orders */}
                          <div className="space-y-0.5">
                            {dayOrders.slice(0, 2).map((order, orderIndex) => (
                              <div
                                key={orderIndex}
                                className={`
                              text-xs p-0.5 rounded text-white transition-opacity
                              ${order.paymentStatus === "PAID" || order.isPaid ? "bg-green-500" : "bg-red-500"}
                            `}
                              >
                                <div className="font-medium truncate text-xs">{formatTime(order.deliveryTime)}</div>
                                <div className="truncate text-xs opacity-90">{order.customerName}</div>
                              </div>
                            ))}
                            {dayOrders.length > 2 && (
                              <div className="text-xs text-gray-500 text-center">+{dayOrders.length - 2}</div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Day Order Summary Modal - Compact */}
            <DayOrderSummaryModal />

            {/* Compact Navigation Footer */}
            <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-gray-200 z-30">
              <div className="p-2 flex justify-center w-full">
                <div className="flex gap-0 w-full max-w-sm">
                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none first:rounded-l-lg h-12 min-w-[44px] min-h-[44px]"
                    onClick={() => router.push("/")}
                  >
                    <Plus className="w-3 h-3" />
                    <span className="text-xs">Order</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none h-12 min-w-[44px] min-h-[44px]"
                    onClick={() => router.push("/receipt")}
                  >
                    <Receipt className="w-3 h-3" />
                    <span className="text-xs">Receipt</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none h-12 min-w-[44px] min-h-[44px]"
                    onClick={() => router.push("/history")}
                  >
                    <History className="w-3 h-3" />
                    <span className="text-xs">History</span>
                  </Button>
                  <Button
                    variant="default"
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white rounded-none h-12 min-w-[44px] min-h-[44px]"
                  >
                    <CalendarIcon className="w-3 h-3" />
                    <span className="text-xs">Calendar</span>
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 flex flex-col items-center justify-center gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none last:rounded-r-lg h-12 min-w-[44px] min-h-[44px]"
                    onClick={() => router.push("/trends")}
                  >
                    <TrendingUp className="w-3 h-3" />
                    <span className="text-xs">Trends</span>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  // Desktop version
  return (
    <ProtectedRoute>
      {/* Sign Out Button - Top Right */}
      <div className="fixed top-4 right-4 z-50">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const auth = getAuth()
            signOut(auth).then(() => {
              router.push("/login")
            })
          }}
          className="bg-white hover:bg-gray-100 text-amber-700 border-amber-300 shadow-sm"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sign Out
        </Button>
      </div>
      <div className="min-h-screen bg-gray-50 relative">
        {/* P&D Logo Watermark - 90% transparent, centered, non-intrusive */}
        <div
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-0"
          style={{
            backgroundImage: `url('/images/pd-logo-watermark-new.png')`,
            backgroundSize: "400px 400px",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
            opacity: 0.1,
          }}
        >
          {/* Fallback image element */}
          <div className="w-96 h-96 opacity-10">
            <img
              src="/images/pd-logo-watermark-new.png"
              alt="P&D Pastry Delights Logo"
              className="w-full h-full object-contain"
              onError={(e) => {
                console.log("Primary watermark image failed, trying fallback")
                e.currentTarget.src = "/images/pd-logo-transparent.png"
                e.currentTarget.onerror = () => {
                  console.log("Fallback watermark image also failed")
                  e.currentTarget.style.display = "none"
                }
              }}
              onLoad={() => console.log("Watermark image loaded successfully")}
            />
          </div>
        </div>

        {/* Connection Status & Error Messages */}
        {error && (
          <div className="mx-4 pt-4 pb-2 relative z-10">
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <span className="text-red-800 text-sm">
                <strong>Firebase Error:</strong> {error}
              </span>
            </div>
          </div>
        )}

        <div className="max-w-7xl mx-auto bg-white min-h-screen relative z-10">
          {/* Statistics Bar */}
          <div className="relative z-20 bg-gray-50 border-b border-gray-200 p-4">
            <div className="grid grid-cols-4 gap-6 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{currentPeriodStats.totalOrders}</div>
                <div className="text-sm text-orange-600 font-medium">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">${currentPeriodStats.totalRevenue.toFixed(0)}</div>
                <div className="text-sm text-green-600 font-medium">Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{currentPeriodStats.totalItems}</div>
                <div className="text-sm text-blue-600 font-medium">Items</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">{currentPeriodStats.activeDays}</div>
                <div className="text-sm text-purple-600 font-medium">Active Days</div>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="relative z-20 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-6">
                <h1 className="text-xl font-semibold text-gray-900">Order Calendar</h1>

                {/* View Mode Buttons - Touch Friendly */}
                <div className="flex bg-gray-100 rounded-lg p-1 gap-1">
                  {(["Day", "Week", "Month", "Year"] as const).map((mode) => (
                    <Button
                      key={mode}
                      variant={viewMode === mode ? "default" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode(mode)}
                      className={`flex-1 text-xs px-3 py-2 min-h-[36px] ${
                        viewMode === mode
                          ? "bg-white shadow-sm text-gray-900 font-semibold"
                          : "text-gray-600 hover:text-gray-900 hover:bg-gray-200"
                      }`}
                    >
                      {mode}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Search and Connection Status */}
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64 text-sm border-gray-300"
                  />
                </div>
                <Badge
                  className={`text-xs flex items-center gap-1 ${
                    isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                  {isConnected ? "Live" : "Offline"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Period Navigation */}
          <div className="relative z-20 border-b border-gray-200 bg-white">
            <div className="flex items-center justify-between p-4">
              <h2 className="text-2xl font-light text-gray-900">{getDisplayTitle()}</h2>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("prev")}
                  className="text-gray-600 hover:text-gray-900 p-2"
                >
                  <ChevronLeft className="w-4 h-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToToday}
                  className="text-gray-700 border-gray-300 hover:bg-gray-50 px-4"
                >
                  Today
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("next")}
                  className="text-gray-600 hover:text-gray-900 p-2"
                >
                  <ChevronRight className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Content Area */}
          <div className="relative z-20">
            {viewMode === "Day" && renderDayView()}
            {viewMode === "Week" && renderWeekView()}
            {viewMode === "Year" && renderYearView()}
            {viewMode === "Month" && (
              <div className="p-4">
                {/* Day Headers */}
                <div className="grid grid-cols-7 border-b border-gray-200">
                  {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((day) => (
                    <div
                      key={day}
                      className="p-3 text-center text-sm font-medium text-gray-600 border-r border-gray-200 last:border-r-0"
                    >
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 border-l border-gray-200">
                  {days.map((dayInfo, index) => {
                    const dateKey = formatDateKey(dayInfo.date)
                    const dayOrders = filteredOrdersByDate[dateKey] || []
                    const isCurrentDay = isToday(dayInfo.date)
                    const isSelected = selectedDate === dateKey

                    return (
                      <div
                        key={index}
                        className={`
                        min-h-[120px] border-r border-b border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors
                        ${isSelected ? "bg-blue-50 border-blue-200" : ""}
                        ${!dayInfo.isCurrentMonth ? "bg-gray-50" : "bg-white"}
                      `}
                        onClick={() => handleDateClick(dayInfo.date)}
                      >
                        {/* Date Number */}
                        <div className="flex justify-between items-start mb-2">
                          <span
                            className={`
                            text-sm font-medium
                            ${!dayInfo.isCurrentMonth ? "text-gray-400" : "text-gray-900"}
                            ${isCurrentDay ? "bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs" : ""}
                          `}
                          >
                            {dayInfo.day}
                          </span>
                          {dayOrders.length > 0 && (
                            <Badge className="bg-amber-100 text-amber-800 text-xs px-1.5 py-0">
                              {dayOrders.length}
                            </Badge>
                          )}
                        </div>

                        {/* Orders for this day */}
                        <div className="space-y-1">
                          {dayOrders.slice(0, 3).map((order, orderIndex) => (
                            <div
                              key={orderIndex}
                              className={`
                              text-xs p-1.5 rounded text-white cursor-pointer hover:opacity-80 transition-opacity
                              ${order.paymentStatus === "PAID" || order.isPaid ? "bg-green-500" : "bg-red-500"}
                            `}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewOrder(order)
                              }}
                            >
                              <div className="font-medium truncate">
                                {formatTime(order.deliveryTime)} {order.customerName}
                              </div>
                              <div className="truncate opacity-90">
                                {order.items.length} {order.items.length === 1 ? "item" : "items"} • $
                                {order.finalTotal.toFixed(0)}
                              </div>
                            </div>
                          ))}
                          {dayOrders.length > 3 && (
                            <div className="text-xs text-gray-500 p-1">+{dayOrders.length - 3} more...</div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Selected Date Details for Month View */}
          {viewMode === "Month" && selectedDate && (
            <div className="relative z-20 border-t border-gray-200 bg-gray-50 p-4">
              <div className="max-w-4xl mx-auto">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Orders for{" "}
                  {new Date(selectedDate + "T00:00:00").toLocaleDateString("en-US", {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                  })}
                </h3>

                {filteredOrdersByDate[selectedDate]?.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredOrdersByDate[selectedDate]
                      .sort((a, b) => a.deliveryTime.localeCompare(b.deliveryTime))
                      .map((order) => (
                        <Card
                          key={order.id}
                          className="hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => handleViewOrder(order)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <div className="font-medium text-gray-900">{order.customerName}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatTime(order.deliveryTime)}
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

                            <div className="text-sm text-gray-600 mb-2">
                              {order.items.length} {order.items.length === 1 ? "item" : "items"} • $
                              {order.finalTotal.toFixed(2)}
                            </div>

                            <div className="text-xs text-gray-500">
                              {order.items.slice(0, 2).map((item, index) => (
                                <div key={index}>
                                  {item.quantity}x {item.name}
                                </div>
                              ))}
                              {order.items.length > 2 && <div>+{order.items.length - 2} more...</div>}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <CalendarDayIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                    <p>No orders found for this date</p>
                    {searchTerm && <p className="text-sm mt-2">Try adjusting your search terms</p>}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 z-30">
          <div className="max-w-7xl mx-auto flex justify-center">
            <div className="flex gap-0 w-full max-w-md">
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-none first:rounded-l-lg"
                onClick={() => router.push("/")}
              >
                <Plus className="w-4 h-4" />
                Order
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-none"
                onClick={() => router.push("/receipt")}
              >
                <Receipt className="w-4 h-4" />
                Receipt
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-none"
                onClick={() => router.push("/history")}
              >
                <History className="w-4 h-4" />
                History
              </Button>
              <Button
                variant="default"
                className="flex-1 flex items-center justify-center gap-2 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-none"
              >
                <CalendarIcon className="w-4 h-4" />
                Calendar
              </Button>
              <Button
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-sm border-gray-300 text-gray-700 hover:bg-gray-50 rounded-none last:rounded-r-lg"
                onClick={() => router.push("/trends")}
              >
                <TrendingUp className="w-4 h-4" />
                Trends
              </Button>
            </div>
          </div>
        </div>

        {/* Day Order Summary Modal */}
        <DayOrderSummaryModal />
      </div>
    </ProtectedRoute>
  )
}
