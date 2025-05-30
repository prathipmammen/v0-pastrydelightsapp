"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useRouter } from "next/navigation"
import { Plus, Receipt, History, TrendingUp, Package, Calendar, Wifi, WifiOff, AlertCircle } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { subscribeToOrders, type FirestoreOrder } from "@/lib/firestore"
import { Badge } from "@/components/ui/badge"

export default function TrendsPage() {
  const router = useRouter()
  const [filterYear, setFilterYear] = useState("All Years")
  const [orders, setOrders] = useState<FirestoreOrder[]>([])
  const [isConnected, setIsConnected] = useState(true)
  const [error, setError] = useState<string | null>(null)

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

    // Cleanup subscription on unmount
    return () => {
      console.log("🔌 Cleaning up Firestore listener for trends")
      unsubscribe()
    }
  }, [])

  const filteredOrders = orders.filter((order) => {
    if (filterYear === "All Years") return true
    const orderDate = new Date(order.deliveryDate + "T00:00:00")
    const orderYear = orderDate.getFullYear().toString()
    return orderYear === filterYear
  })

  const totalOrders = filteredOrders.length
  const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.finalTotal, 0)
  const totalItemsSold = filteredOrders.reduce(
    (sum, order) => sum + order.items.reduce((itemSum, item) => itemSum + item.quantity, 0),
    0,
  )
  const uniqueCustomers = new Set(filteredOrders.map((order) => order.customerName)).size

  const monthlyData = filteredOrders.reduce(
    (acc, order) => {
      // Parse the date correctly - deliveryDate is in YYYY-MM-DD format
      const date = new Date(order.deliveryDate + "T00:00:00") // Add time to ensure proper parsing
      const year = date.getFullYear()
      const monthIndex = date.getMonth() // 0-11

      // Create a key that includes both year and month for proper grouping
      const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
      const monthKey = monthNames[monthIndex]

      // If filtering by year, only include orders from that year
      if (filterYear !== "All Years" && year.toString() !== filterYear) {
        return acc
      }

      if (!acc[monthKey]) {
        acc[monthKey] = { month: monthKey, sales: 0, orders: 0 }
      }

      acc[monthKey].sales += order.finalTotal
      acc[monthKey].orders += 1

      return acc
    },
    {} as Record<string, { month: string; sales: number; orders: number }>,
  )

  const monthOrder = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
  const chartData = monthOrder.map((month) => monthlyData[month] || { month, sales: 0, orders: 0 })

  const categoryData = filteredOrders.reduce(
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

  const availableYears = [
    "All Years",
    ...new Set(
      orders.map((order) => {
        const orderDate = new Date(order.deliveryDate + "T00:00:00")
        return orderDate.getFullYear().toString()
      }),
    ),
  ]

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

        {/* Analytics Dashboard */}
        <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200 mb-4 sm:mb-6">
          <CardHeader className="bg-amber-100/95 border-b border-amber-200">
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
              <div className="flex items-center gap-2">
                <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-amber-700" />
                <span className="text-xs sm:text-sm text-amber-700">Filter by Year:</span>
                <Select value={filterYear} onValueChange={setFilterYear}>
                  <SelectTrigger className="w-24 sm:w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableYears.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

            {/* Professional Sales Chart */}
            <Card className="bg-white/90 mb-4 sm:mb-6">
              <CardHeader>
                <CardTitle className="text-amber-800 text-base sm:text-lg">Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 sm:h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#666" }} />
                      <YAxis
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 10, fill: "#666" }}
                        label={{ value: "Sales", angle: -90, position: "insideLeft" }}
                      />
                      <Tooltip
                        formatter={(value, name) => [`$${Number(value).toFixed(2)}`, "Sales"]}
                        labelStyle={{ color: "#333" }}
                        contentStyle={{
                          backgroundColor: "#fff",
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                      <Bar dataKey="sales" fill="#0f766e" name="Sales" radius={[2, 2, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
              {/* Monthly Orders Chart */}
              <Card className="bg-white/90">
                <CardHeader>
                  <CardTitle className="text-amber-800 text-base sm:text-lg">Monthly Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-48 sm:h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
                        <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                        <YAxis
                          tick={{ fontSize: 10 }}
                          label={{ value: "Total Quantity", angle: -90, position: "insideLeft" }}
                        />
                        <Tooltip
                          formatter={(value, name) => [value, "Orders"]}
                          labelFormatter={(label) => `Month: ${label}`}
                        />
                        <Line
                          type="monotone"
                          dataKey="orders"
                          stroke="#f59e0b"
                          strokeWidth={3}
                          dot={{ fill: "#f59e0b", strokeWidth: 2, r: 4 }}
                          name="Total Quantity"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Category Performance */}
              <Card className="bg-white/90">
                <CardHeader>
                  <CardTitle className="text-amber-800 text-base sm:text-lg">Category Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {Object.entries(categoryData).map(([category, data]) => (
                      <div key={category} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-4 flex-1">
                          <span className="font-medium text-gray-800 text-sm w-12 sm:w-16">{category}</span>
                          <div className="flex-1 bg-gray-200 rounded-full h-3 sm:h-4 relative min-w-[100px] sm:min-w-[200px]">
                            <div
                              className="bg-orange-400 h-3 sm:h-4 rounded-full"
                              style={{ width: `${Math.min((data.items / totalItemsSold) * 100, 100)}%` }}
                            />
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-semibold text-amber-800 text-xs sm:text-sm">{data.items} items</div>
                          <div className="text-xs text-gray-600">${data.revenue.toFixed(0)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top 10 Selling Items */}
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle className="text-amber-800 text-base sm:text-lg">
                  Top 10 Selling Items {filterYear !== "All Years" && `(${filterYear})`}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 sm:space-y-4">
                  {top10Items.length > 0 ? (
                    top10Items.map(([itemName, data], index) => (
                      <div key={itemName} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-2 sm:gap-3 flex-1">
                          <div className="w-6 h-6 sm:w-8 sm:h-8 bg-orange-400 rounded-full flex items-center justify-center text-white font-bold text-xs sm:text-sm">
                            {index + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-800 text-xs sm:text-sm truncate">{itemName}</div>
                            <div className="text-xs text-gray-500">{data.category}</div>
                          </div>
                        </div>
                        <div className="text-right ml-2">
                          <div className="font-semibold text-amber-800 text-xs sm:text-sm">{data.quantity} sold</div>
                          <div className="text-xs text-gray-600">${data.revenue.toFixed(2)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center text-gray-500 py-8">
                      <Package className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-4 text-gray-300" />
                      <p className="text-sm">No sales data available for {filterYear}</p>
                      {orders.length === 0 && (
                        <p className="text-xs text-gray-400 mt-2">
                          Data will appear here automatically when orders are submitted.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
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
  )
}
