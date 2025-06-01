import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"

export interface FirestoreOrder {
  id?: string
  receiptId: string
  customerName: string
  customerContact: string
  deliveryDate: string
  deliveryTime: string
  paymentMethod: string
  paymentStatus: "PAID" | "UNPAID" // New field
  isDelivery: boolean
  deliveryAddress: string
  deliveryFee: number
  items: Array<{
    name: string
    category: string
    quantity: number
    unitPrice: number
    total: number
  }>
  puffSubtotal: number
  discount: number
  discountPercent: string
  preTaxSubtotal: number
  tax: number
  taxRate: number
  finalTotal: number
  isPaid: boolean // Keep for backward compatibility
  status: "pending" | "completed"
  createdAt: string | Timestamp
  updatedAt?: string | Timestamp
  // Rewards fields
  customerId?: string
  pointsEarned?: number
  pointsRedeemed?: number
  rewardsDiscountAmount?: number
  customerRewardsBalance?: number
}

const ORDERS_COLLECTION = "orders"

// Add a new order to Firestore
export const addOrder = async (orderData: Omit<FirestoreOrder, "id" | "updatedAt">): Promise<string> => {
  try {
    console.log("🔄 Adding order to Firestore:", orderData)
    const docRef = await addDoc(collection(db, ORDERS_COLLECTION), {
      ...orderData,
      status: "pending", // Default status
      paymentStatus: orderData.paymentStatus || "UNPAID", // Ensure payment status is set
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Order added to Firestore with ID:", docRef.id)
    return docRef.id
  } catch (error) {
    console.error("❌ Error adding order to Firestore:", error)
    throw new Error(`Failed to save order: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Update an existing order in Firestore
export const updateOrder = async (orderId: string, orderData: Partial<FirestoreOrder>): Promise<void> => {
  try {
    console.log("🔄 Updating order in Firestore:", orderId, orderData)
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    await updateDoc(orderRef, {
      ...orderData,
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Order updated in Firestore:", orderId)
  } catch (error) {
    console.error("❌ Error updating order in Firestore:", error)
    throw new Error(`Failed to update order: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Update payment status for an order
export const updatePaymentStatus = async (orderId: string, paymentStatus: "PAID" | "UNPAID"): Promise<void> => {
  try {
    console.log("💳 Updating payment status:", orderId, paymentStatus)
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    await updateDoc(orderRef, {
      paymentStatus,
      isPaid: paymentStatus === "PAID", // Update legacy field for compatibility
      updatedAt: serverTimestamp(),
    })
    console.log("✅ Payment status updated:", orderId, paymentStatus)
  } catch (error) {
    console.error("❌ Error updating payment status:", error)
    throw new Error(`Failed to update payment status: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Delete an order from Firestore
export const deleteOrder = async (orderId: string): Promise<void> => {
  try {
    console.log("🔄 Deleting order from Firestore:", orderId)
    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    await deleteDoc(orderRef)
    console.log("✅ Order deleted from Firestore:", orderId)
  } catch (error) {
    console.error("❌ Error deleting order from Firestore:", error)
    throw new Error(`Failed to delete order: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Subscribe to real-time orders updates
export const subscribeToOrders = (callback: (orders: FirestoreOrder[]) => void, onError?: (error: Error) => void) => {
  console.log("🔄 Setting up real-time Firestore listener...")
  const q = query(collection(db, ORDERS_COLLECTION), orderBy("createdAt", "desc"))

  return onSnapshot(
    q,
    (snapshot) => {
      const orders: FirestoreOrder[] = []
      snapshot.forEach((doc) => {
        const data = doc.data()
        orders.push({
          id: doc.id,
          ...data,
          // Ensure payment status exists (for backward compatibility)
          paymentStatus: data.paymentStatus || (data.isPaid ? "PAID" : "UNPAID"),
          // Convert Firestore Timestamps to ISO strings for consistency
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
          updatedAt: data.updatedAt instanceof Timestamp ? data.updatedAt.toDate().toISOString() : data.updatedAt,
        } as FirestoreOrder)
      })
      console.log("📡 Real-time orders update:", orders.length, "orders")
      callback(orders)
    },
    (error) => {
      console.error("❌ Error in orders subscription:", error)
      if (onError) {
        onError(new Error(`Failed to sync orders: ${error.message}`))
      }
    },
  )
}

// Helper function to convert order data for Firestore
export const prepareOrderForFirestore = (orderData: any): Omit<FirestoreOrder, "id" | "updatedAt"> => {
  const isPaid = orderData.paymentStatus === "PAID" || orderData.isPaid

  return {
    receiptId: orderData.receiptId,
    customerName: orderData.customerName,
    customerContact: orderData.customerContact,
    deliveryDate: orderData.deliveryDate,
    deliveryTime: orderData.deliveryTime,
    paymentMethod: orderData.paymentMethod,
    paymentStatus: orderData.paymentStatus || "UNPAID",
    isDelivery: orderData.isDelivery,
    deliveryAddress: orderData.deliveryAddress || "",
    deliveryFee: orderData.deliveryFee,
    items: orderData.items,
    puffSubtotal: orderData.puffSubtotal,
    discount: orderData.discount,
    discountPercent: orderData.discountPercent,
    preTaxSubtotal: orderData.preTaxSubtotal,
    tax: orderData.tax,
    taxRate: orderData.taxRate,
    finalTotal: orderData.finalTotal,
    isPaid: isPaid,
    status: orderData.status || "pending",
    createdAt: orderData.createdAt || new Date().toISOString(),
    // Rewards fields - only apply if order is PAID
    customerId: orderData.customerId || null,
    pointsEarned: isPaid ? orderData.pointsEarned || 0 : 0,
    pointsRedeemed: isPaid ? orderData.pointsRedeemed || 0 : 0,
    rewardsDiscountAmount: isPaid ? orderData.rewardsDiscountAmount || 0 : 0,
    customerRewardsBalance: orderData.customerRewardsBalance || 0,
  }
}

// Update rewards when payment status changes
export const updateOrderRewards = async (orderId: string, isPaid: boolean, orderTotal: number): Promise<void> => {
  try {
    console.log("🎁 Updating order rewards:", orderId, isPaid, orderTotal)

    const orderRef = doc(db, ORDERS_COLLECTION, orderId)
    const updateData: any = {
      updatedAt: serverTimestamp(),
    }

    if (isPaid) {
      // Award points when marking as paid
      updateData.pointsEarned = Math.floor(orderTotal)
    } else {
      // Remove points when marking as unpaid
      updateData.pointsEarned = 0
      updateData.pointsRedeemed = 0
      updateData.rewardsDiscountAmount = 0
    }

    await updateDoc(orderRef, updateData)
    console.log("✅ Order rewards updated successfully")
  } catch (error) {
    console.error("❌ Error updating order rewards:", error)
    throw error
  }
}

// Export orders to Excel/CSV format
export const exportOrdersToCSV = (orders: FirestoreOrder[]): void => {
  console.log("📊 Exporting", orders.length, "orders to CSV...")

  const headers = [
    "Receipt ID",
    "Customer Name",
    "Contact Info",
    "Pickup Date",
    "Pickup Time",
    "Payment Method",
    "Payment Status",
    "Delivery Required",
    "Delivery Address",
    "Delivery Fee",
    "Items Count",
    "Items Details",
    "Puff Subtotal",
    "Discount Percent",
    "Discount Amount",
    "Pre-Tax Subtotal",
    "Tax Rate",
    "Tax Amount",
    "Final Total",
    "Status",
    "Order Date",
    "Firebase ID",
    "Points Earned",
    "Points Redeemed",
    "Rewards Discount",
    "Customer Balance",
  ]

  const csvContent = [
    headers.join(","),
    ...orders.map((order) => {
      const itemsDetails = order.items
        .map((item) => `${item.quantity}x ${item.name} (${item.category}) @ $${item.unitPrice} = $${item.total}`)
        .join("; ")

      return [
        order.receiptId,
        `"${order.customerName}"`,
        `"${order.customerContact}"`,
        order.deliveryDate,
        order.deliveryTime,
        order.paymentMethod,
        order.paymentStatus || (order.isPaid ? "PAID" : "UNPAID"),
        order.isDelivery ? "Yes" : "No",
        `"${order.deliveryAddress}"`,
        order.deliveryFee.toFixed(2),
        order.items.length,
        `"${itemsDetails}"`,
        order.puffSubtotal.toFixed(2),
        order.discountPercent,
        order.discount.toFixed(2),
        order.preTaxSubtotal.toFixed(2),
        `${(order.taxRate * 100).toFixed(2)}%`,
        order.tax.toFixed(2),
        order.finalTotal.toFixed(2),
        order.status,
        order.createdAt,
        order.id || "",
        order.pointsEarned || 0,
        order.pointsRedeemed || 0,
        (order.rewardsDiscountAmount || 0).toFixed(2),
        order.customerRewardsBalance || 0,
      ].join(",")
    }),
  ].join("\n")

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `pastry-orders-backup-${new Date().toISOString().split("T")[0]}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  window.URL.revokeObjectURL(url)

  console.log("✅ Orders exported successfully")
}
