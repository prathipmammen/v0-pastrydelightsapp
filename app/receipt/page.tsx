"use client"

import { useEffect, useState } from "react"
import Receipt from "@/components/receipt"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Plus, ReceiptIcon, History, TrendingUp, FileX } from "lucide-react"

export default function ReceiptPage() {
  const [orderData, setOrderData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Set a timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      setIsLoading(false)
    }, 1000)

    const storedOrder = localStorage.getItem("currentOrder")
    if (storedOrder) {
      try {
        const parsedOrder = JSON.parse(storedOrder)
        setOrderData(parsedOrder)
        setIsLoading(false)
        clearTimeout(loadingTimeout)
        // Don't remove the order data immediately to allow for printing
      } catch (error) {
        console.error("Error parsing order data:", error)
        setIsLoading(false)
        clearTimeout(loadingTimeout)
      }
    } else {
      setIsLoading(false)
      clearTimeout(loadingTimeout)
    }

    return () => clearTimeout(loadingTimeout)
  }, [])

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
      <div className="max-w-4xl mx-auto flex-grow w-full">
        {/* Content Area */}
        {isLoading ? (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-800 mx-auto mb-4"></div>
              <h2 className="text-lg sm:text-xl font-semibold text-gray-600">Loading receipt...</h2>
            </div>
          </div>
        ) : orderData ? (
          <Receipt {...orderData} />
        ) : (
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm p-8">
            <div className="text-center">
              <FileX className="w-16 h-16 mx-auto mb-4 text-gray-400" />
              <h2 className="text-xl sm:text-2xl font-semibold text-gray-600 mb-4">No Receipt to Display</h2>
              <p className="text-gray-500 mb-6">
                There's no receipt data available. Create a new order or view your order history.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Button
                  onClick={() => router.push("/")}
                  className="bg-amber-600 hover:bg-amber-700 text-white flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create New Order
                </Button>
                <Button variant="outline" onClick={() => router.push("/history")} className="flex items-center gap-2">
                  <History className="w-4 h-4" />
                  View Order History
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer - Always at bottom and hidden when printing */}
      <div className="print:hidden bg-white/95 backdrop-blur-sm rounded-lg shadow-sm mt-4 sm:mt-6 sticky bottom-0">
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
              variant="default"
              className="flex items-center gap-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white"
            >
              <ReceiptIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">Receipt</span>
            </Button>
            <Button
              variant="outline"
              className="flex items-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50"
              onClick={() => router.push("/history")}
            >
              <History className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">History</span>
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
