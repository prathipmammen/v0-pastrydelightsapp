"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useRouter } from "next/navigation"
import {
  LogOut,
  Plus,
  Receipt,
  History,
  TrendingUp,
  Package,
  CalendarIcon,
  Wifi,
  WifiOff,
  AlertCircle,
} from "lucide-react"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  Cell,
} from "recharts"
import { subscribeToOrders, type FirestoreOrder } from "@/lib/firestore"
import { Badge } from "@/components/ui/badge"
import DateRangePicker, { type DateRange } from "@/components/date-range-picker"
import ProtectedRoute from "@/components/protected-route"
import { getAuth, signOut } from "firebase/auth"

export default function TrendsPage() {
  const router = useRouter()
  const [orders, setOrders] = useState<FirestoreOrder[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Initialize with "Year to Date" as default
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const now = new Date()
    const start = new Date(now.getFullYear(), 0, 1) // January 1st of current year
    const end = now // Today
    return { from: start, to: end, label: "Year to Date" }
  })

  useEffect(() => {
    console.log("🔄 Setting up Firestore real-time listener for trends...")

    const unsubscribe = subscribeToOrders(
      (firestoreOrders) => {
        console.log("📡 Received orders update for trends:", firestoreOrders.length, "orders")
        setOrders(firestoreOrders)
        setIsConnected(true)
        setError(null)
      },
      (error) => {
        console.error("❌ Firestore connection error in trends:", error)
        setError(error.message)
        setIsConnected(false)
      },
    )

    return () => {
      console.log("🔌 Cleaning up Firestore listener for trends")
      unsubscribe()
    }
  }, [])

  // Filter orders based on selected date range
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const orderDate = new Date(order.deliveryDate + "T00:00:00")
      return orderDate >= dateRange.from && orderDate <= dateRange.to
    })
  }, [orders, dateRange])

  const totalOrders = filteredOrders.length
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.finalTotal, 0)
  const totalItemsSold = filteredOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  )
  const uniqueCustomers = new Set(filteredOrders.map((order) => order.customerName)).size

  // Generate chronologically sorted chart data
  const chartData = useMemo(() => {
    const today = new Date()
    const isWholeYearOutlook = dateRange.label === "Whole Year Outlook"

    // Always use monthly data for better visualization
    const monthlyData: Record<
      string,
      {
        month: string
        monthNum: number
        sales: number
        orders: number
        isFuture: boolean
      }
    > = {}

    // Get the range of months to display
    const startMonth = dateRange.from.getMonth()
    const startYear = dateRange.from.getFullYear()
    const endMonth = dateRange.to.getMonth()
    const endYear = dateRange.to.getFullYear()

    // Initialize all months in the range with zero values
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 0
      const monthEnd = year === endYear ? endMonth : 11

      for (let month = monthStart; month <= monthEnd; month++) {
        const monthDate = new Date(year, month, 1)
        const monthKey = `${year}-${month.toString().padStart(2, "0")}`
        const monthName = monthDate.toLocaleDateString("en-US", { month: "short" })
        const isFuture = isWholeYearOutlook && monthDate > today

        monthlyData[monthKey] = {
          month: monthName,
          monthNum: month,
          sales: 0,
          orders: 0,
          isFuture,
        }
      }
    }

    // Add actual order data
    filteredOrders.forEach((order) => {
      const orderDate = new Date(order.deliveryDate + "T00:00:00")
      const monthKey = `${orderDate.getFullYear()}-${orderDate.getMonth().toString().padStart(2, "0")}`

      if (monthlyData[monthKey]) {
        monthlyData[monthKey].sales += order.finalTotal
        monthlyData[monthKey].orders += 1
      }
    })

    // Sort chronologically and return
    return Object.values(monthlyData).sort((a, b) => a.monthNum - b.monthNum)
  }, [filteredOrders, dateRange])

  // Category data with validation
  const categoryData = useMemo(() => {
    const data = filteredOrders.reduce(
      (acc, order) => {
        order.items.forEach((item) => {
          if (!acc[item.category]) {
            acc[item.category] = { items: 0, revenue: 0 }
          }
          acc[item.category].items += item.quantity
          acc[item.category].revenue += item.total
        })
        return acc
      },
      {} as Record<string, { items: number; revenue: number }>,
    )

    // Validation: Ensure category totals match dashboard totals
    const categoryTotalItems = Object.values(data).reduce((sum, cat) => sum + cat.items, 0)
    const categoryTotalRevenue = Object.values(data).reduce((sum, cat) => sum + cat.revenue, 0)

    if (Math.abs(categoryTotalItems - totalItemsSold) > 0.01) {
      console.warn("Category items total doesn't match dashboard total:", categoryTotalItems, "vs", totalItemsSold)
    }
    if (Math.abs(categoryTotalRevenue - totalRevenue) > 0.01) {
      console.warn("Category revenue total doesn't match dashboard total:", categoryTotalRevenue, "vs", totalRevenue)
    }

    return data
  }, [filteredOrders, totalItemsSold, totalRevenue])

  const itemData = filteredOrders.reduce(
    (acc, order) => {
      order.items.forEach((item) => {
        if (!acc[item.name]) {
          acc[item.name] = {
            category: item.category,
            quantity: 0,
            revenue: 0,
          }
        }
        acc[item.name].quantity += item.quantity
        acc[item.name].revenue += item.total
      })
      return acc
    },
    {} as Record<string, { category: string; quantity: number; revenue: number }>,
  )

  const top10Items = Object.entries(itemData)
    .sort(([, a], [, b]) => b.quantity - a.quantity)
    .slice(0, 10)

  // Format date range display
  const formatDateRangeDisplay = (range: DateRange) => {
    const options: Intl.DateTimeFormatOptions = {
      month: "short",
      day: "numeric",
      year: "numeric",
    }

    if (range.label !== "Custom Range") {
      return `${range.label} (${range.from.toLocaleDateString("en-US", options)} - ${range.to.toLocaleDateString("en-US", options)})`
    }
    return `${range.from.toLocaleDateString("en-US", options)} - ${range.to.toLocaleDateString("en-US", options)}`
  }

  // Custom tooltip for charts with future month indication
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white/95 backdrop-blur-sm p-3 border border-amber-200 rounded-lg shadow-lg">
          <p className="font-medium text-amber-800">{`${label}`}</p>
          {data.isFuture ? (
            <p className="text-gray-500 text-sm">Future month - no data</p>
          ) : (
            <>
              <p className="text-amber-600 font-medium">{`Sales: $${payload[0].value?.toFixed(2) || 0}`}</p>
              <p className="text-orange-600 font-medium">{`Orders: ${payload[1]?.value || payload[0].payload.orders}`}</p>
            </>
          )}
        </div>
      )
    }
    return null
  }

  // P&D Pastry Delights theme color
  const pdAmberColor = "#E37B00"
  const pdFutureColor = "#D3D3D3"

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

          {/* Analytics Dashboard */}
          <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200 mb-4 sm:mb-6">
            <CardHeader className="bg-amber-100/95 border-b border-amber-200">
              <div className="flex flex-col gap-4">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                  <CardTitle className="flex items-center gap-2 text-amber-800 text-base sm:text-lg">
                    Data Trends & Analytics
                    <Badge
                      className={`text-xs flex items-center gap-1 ${
                        isConnected ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                      }`}
                    >
                      {isConnected ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {isConnected ? "Live Data" : "Disconnected"}
                    </Badge>
                  </CardTitle>
                </div>

                {/* Date Range Picker */}
                <div className="bg-white/80 p-4 rounded-lg border border-amber-200">
                  <DateRangePicker value={dateRange} onChange={setDateRange} className="w-full" />
                </div>

                {/* Selected Date Range Display */}
                <div className="bg-amber-200/50 p-3 rounded-lg">
                  <div className="text-sm font-medium text-amber-800">
                    📊 Viewing Data: {formatDateRangeDisplay(dateRange)}
                  </div>
                  {dateRange.label === "Whole Year Outlook" && (
                    <div className="text-xs text-amber-700 mt-1">
                      * Future months shown with grayed indicators (no data yet)
                    </div>
                  )}
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 sm:mb-8">
                <Card className="bg-amber-100/90 border-amber-300">
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-amber-800">{totalOrders}</div>
                    <div className="text-xs sm:text-sm text-amber-600">Total Orders</div>
                  </CardContent>
                </Card>
                <Card className="bg-green-100/90 border-green-300">
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-green-800">${Math.round(totalRevenue)}</div>
                    <div className="text-xs sm:text-sm text-green-600">Revenue</div>
                  </CardContent>
                </Card>
                <Card className="bg-blue-100/90 border-blue-300">
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-blue-800">{totalItemsSold}</div>
                    <div className="text-xs sm:text-sm text-blue-600">Items Sold</div>
                  </CardContent>
                </Card>
                <Card className="bg-purple-100/90 border-purple-300">
                  <CardContent className="p-3 sm:p-4 text-center">
                    <div className="text-xl sm:text-3xl font-bold text-purple-800">{uniqueCustomers}</div>
                    <div className="text-xs sm:text-sm text-purple-600">Customers</div>
                  </CardContent>
                </Card>
              </div>

              {/* No Data Message */}
              {filteredOrders.length === 0 && dateRange.label !== "Whole Year Outlook" ? (
                <div className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No data for selected dates</h3>
                  <p className="text-gray-600">
                    Try selecting a different date range or check if orders exist for this period.
                  </p>
                </div>
              ) : (
                <>
                  {/* Professional Sales Chart */}
                  <Card className="bg-white/90 mb-4 sm:mb-6">
                    <CardHeader>
                      <CardTitle className="text-amber-800 text-base sm:text-lg">
                        Sales Trend ({dateRange.label})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 sm:h-96">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" opacity={0.7} />
                            <XAxis
                              dataKey="month"
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: "#92400e", fontWeight: 500 }}
                              label={{
                                value: "Month",
                                position: "insideBottom",
                                offset: -10,
                                style: { textAnchor: "middle", fill: "#92400e", fontWeight: 600 },
                              }}
                            />
                            <YAxis
                              axisLine={false}
                              tickLine={false}
                              tick={{ fontSize: 11, fill: "#92400e", fontWeight: 500 }}
                              label={{
                                value: "Sales ($)",
                                angle: -90,
                                position: "insideLeft",
                                style: { textAnchor: "middle", fill: "#92400e", fontWeight: 600 },
                              }}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Bar dataKey="sales" name="Sales" radius={[4, 4, 0, 0]}>
                              {chartData.map((entry, index) => (
                                <Cell
                                  key={`cell-${index}`}
                                  fill={entry.isFuture ? pdFutureColor : pdAmberColor}
                                  stroke={entry.isFuture ? "#C0C0C0" : "#D06800"}
                                  strokeWidth={1}
                                />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Charts Grid */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
                    {/* Orders Chart */}
                    <Card className="bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-amber-800 text-base sm:text-lg">Order Count</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="h-48 sm:h-64">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 40 }}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                              <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10 }}
                                label={{
                                  value: "Month",
                                  position: "insideBottom",
                                  offset: -10,
                                  style: { textAnchor: "middle" },
                                }}
                              />
                              <YAxis
                                tick={{ fontSize: 10 }}
                                label={{ value: "Orders", angle: -90, position: "insideLeft" }}
                              />
                              <Tooltip content={<CustomTooltip />} />
                              <Line
                                type="monotone"
                                dataKey="orders"
                                stroke={pdAmberColor}
                                strokeWidth={3}
                                strokeDasharray={(entry: any) => (entry?.isFuture ? "8,4" : "0")}
                                dot={false}
                                activeDot={{ r: 6, fill: pdAmberColor, stroke: "#fff", strokeWidth: 2 }}
                                name="Orders"
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Category Performance */}
                    <Card className="bg-white/90">
                      <CardHeader>
                        <CardTitle className="text-amber-800 text-base sm:text-lg">
                          Category Performance
                          <span className="text-xs text-gray-500 ml-2">
                            (Total: {totalItemsSold} items, ${totalRevenue.toFixed(2)})
                          </span>
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {Object.entries(categoryData).length > 0 ? (
                            Object.entries(categoryData).map(([category, data]) => (
                              <div
                                key={category}
                                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                              >
                                <div className="flex items-center gap-2 sm:gap-4 flex-1">
                                  <span className="font-medium text-gray-800 text-sm w-12 sm:w-16">{category}</span>
                                  <div className="flex-1 bg-gray-200 rounded-full h-3 sm:h-4 relative min-w-[100px] sm:min-w-[200px]">
                                    <div
                                      className="h-3 sm:h-4 rounded-full transition-all duration-300"
                                      style={{
                                        width: `${totalItemsSold > 0 ? Math.min((data.items / totalItemsSold) * 100, 100) : 0}%`,
                                        backgroundColor: pdAmberColor,
                                      }}
                                    />
                                  </div>
                                </div>
                                <div className="text-right ml-2">
                                  <div className="font-semibold text-amber-800 text-xs sm:text-sm">
                                    {data.items} items
                                  </div>
                                  <div className="text-xs text-gray-600">${data.revenue.toFixed(2)}</div>
                                  <div className="text-xs text-gray-400">
                                    {totalItemsSold > 0 ? ((data.items / totalItemsSold) * 100).toFixed(1) : 0}%
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            <div className="text-center text-gray-500 py-4">
                              <p className="text-sm">No category data available for selected period</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Top 10 Selling Items */}
                  <Card className="bg-white/90">
                    <CardHeader>
                      <CardTitle className="text-amber-800 text-base sm:text-lg">
                        Top 10 Selling Items ({dateRange.label})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3 sm:space-y-4">
                        {top10Items.length > 0 ? (
                          top10Items.map(([itemName, data], index) => (
                            <div key={itemName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-2 sm:gap-3 flex-1">
                                <div
                                  className="w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm"
                                  style={{ backgroundColor: pdAmberColor }}
                                >
                                  {index + 1}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">
                                    {itemName}
                                  </div>
                                  <div className="text-xs text-gray-500">{data.category}</div>
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <div className="font-semibold text-amber-800 text-xs sm:text-sm">
                                  {data.quantity} sold
                                </div>
                                <div className="text-xs text-gray-600">${data.revenue.toFixed(2)}</div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
                            <p className="text-sm">No sales data available for selected period</p>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
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
                variant="outline"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none"
                onClick={() => router.push("/history")}
              >
                <History className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden sm:inline">History</span>
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
                variant="default"
                className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-none first:rounded-l-lg last:rounded-r-lg"
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
