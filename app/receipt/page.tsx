"use client"

import { useEffect, useState } from "react"
import Receipt from "@/components/receipt"

interface OrderData {
  receiptId: string
  customerName: string
  customerContact: string
  deliveryDate: string
  deliveryTime: string
  paymentMethod: string
  isDelivery: boolean
  deliveryAddress?: string
  deliveryFee: number
  items: {
    name: string
    category: string
    quantity: number
    unitPrice: number
    total: number
  }[]
  puffSubtotal: number
  discount: number
  discountPercent: string
  preTaxSubtotal: number
  tax: number
  taxRate: number
  finalTotal: number
  isPaid: boolean
  firestoreId?: string
  // Rewards fields
  pointsEarned?: number
  pointsRedeemed?: number
  rewardsDiscountAmount?: number
  customerRewardsBalance?: number
}

export default function ReceiptPage() {
  const [orderData, setOrderData] = useState<OrderData | null>(null)

  useEffect(() => {
    // Get order data from localStorage
    const storedOrder = localStorage.getItem("currentOrder")
    if (storedOrder) {
      try {
        const parsedOrder = JSON.parse(storedOrder)
        setOrderData(parsedOrder)
      } catch (error) {
        console.error("Error parsing order data:", error)
      }
    }
  }, [])

  if (!orderData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-amber-50">
        <div className="text-center p-6 bg-white rounded-lg shadow-md">
          <h2 className="text-xl font-bold text-amber-800 mb-2">No Receipt Available</h2>
          <p className="text-amber-600">Please create an order first to view the receipt.</p>
        </div>
      </div>
    )
  }

  // Calculate previous balance (before this transaction)
  const previousBalance = orderData.customerRewardsBalance
    ? orderData.customerRewardsBalance - (orderData.pointsEarned || 0) + (orderData.pointsRedeemed || 0)
    : 0

  return <Receipt {...orderData} customerPreviousBalance={previousBalance} />
}
