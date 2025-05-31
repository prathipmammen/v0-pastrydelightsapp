import {
  collection,
  addDoc,
  updateDoc,
  doc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore"
import { db } from "./firebase"

export interface Customer {
  id?: string
  name: string
  phone: string
  email: string
  rewardsPoints: number
  createdAt: string | Timestamp
  updatedAt?: string | Timestamp
}

export interface RewardsTransaction {
  customerId: string
  orderId: string
  pointsEarned: number
  pointsRedeemed: number
  discountAmount: number
  orderSubtotal: number
  createdAt: string | Timestamp
}

const CUSTOMERS_COLLECTION = "customers"
const REWARDS_TRANSACTIONS_COLLECTION = "rewardsTransactions"

// Points calculation constants
export const POINTS_PER_DOLLAR = 1
export const POINTS_FOR_REDEMPTION = 100
export const REDEMPTION_DISCOUNT_PERCENT = 0.1 // 10%

// Find existing customer by phone, email, or name
export const findCustomer = async (name: string, phone: string, email: string): Promise<Customer | null> => {
  try {
    console.log("🔍 Searching for customer:", { name, phone, email })

    const customersRef = collection(db, CUSTOMERS_COLLECTION)

    // Search by phone first (most reliable)
    if (phone && phone.trim() !== "") {
      const phoneQuery = query(customersRef, where("phone", "==", phone.trim()))
      const phoneSnapshot = await getDocs(phoneQuery)
      if (!phoneSnapshot.empty) {
        const customerDoc = phoneSnapshot.docs[0]
        const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer
        console.log("✅ Found customer by phone:", customer)
        return customer
      }
    }

    // Search by email if phone didn't match
    if (email && email.trim() !== "") {
      const emailQuery = query(customersRef, where("email", "==", email.trim().toLowerCase()))
      const emailSnapshot = await getDocs(emailQuery)
      if (!emailSnapshot.empty) {
        const customerDoc = emailSnapshot.docs[0]
        const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer
        console.log("✅ Found customer by email:", customer)
        return customer
      }
    }

    // Search by name if phone and email didn't match
    if (name && name.trim() !== "") {
      const nameQuery = query(customersRef, where("name", "==", name.trim()))
      const nameSnapshot = await getDocs(nameQuery)
      if (!nameSnapshot.empty) {
        const customerDoc = nameSnapshot.docs[0]
        const customer = { id: customerDoc.id, ...customerDoc.data() } as Customer
        console.log("✅ Found customer by name:", customer)
        return customer
      }
    }

    console.log("❌ No existing customer found")
    return null
  } catch (error) {
    console.error("❌ Error finding customer:", error)
    throw new Error(`Failed to find customer: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Create new customer
export const createCustomer = async (name: string, phone: string, email: string): Promise<Customer> => {
  try {
    console.log("🆕 Creating new customer:", { name, phone, email })

    const customerData = {
      name: name.trim(),
      phone: phone.trim(),
      email: email.trim().toLowerCase(),
      rewardsPoints: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    }

    const docRef = await addDoc(collection(db, CUSTOMERS_COLLECTION), customerData)

    const newCustomer: Customer = {
      id: docRef.id,
      name: customerData.name,
      phone: customerData.phone,
      email: customerData.email,
      rewardsPoints: 0,
      createdAt: new Date().toISOString(),
    }

    console.log("✅ Created new customer:", newCustomer)
    return newCustomer
  } catch (error) {
    console.error("❌ Error creating customer:", error)
    throw new Error(`Failed to create customer: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Update customer rewards points
export const updateCustomerPoints = async (customerId: string, newPointsBalance: number): Promise<void> => {
  try {
    console.log("🔄 Updating customer points:", { customerId, newPointsBalance })

    const customerRef = doc(db, CUSTOMERS_COLLECTION, customerId)
    await updateDoc(customerRef, {
      rewardsPoints: newPointsBalance,
      updatedAt: serverTimestamp(),
    })

    console.log("✅ Customer points updated successfully")
  } catch (error) {
    console.error("❌ Error updating customer points:", error)
    throw new Error(`Failed to update customer points: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Record rewards transaction
export const recordRewardsTransaction = async (transaction: Omit<RewardsTransaction, "createdAt">): Promise<void> => {
  try {
    console.log("📝 Recording rewards transaction:", transaction)

    await addDoc(collection(db, REWARDS_TRANSACTIONS_COLLECTION), {
      ...transaction,
      createdAt: serverTimestamp(),
    })

    console.log("✅ Rewards transaction recorded successfully")
  } catch (error) {
    console.error("❌ Error recording rewards transaction:", error)
    throw new Error(`Failed to record rewards transaction: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Calculate points earned from order subtotal
export const calculatePointsEarned = (subtotal: number): number => {
  return Math.floor(subtotal * POINTS_PER_DOLLAR)
}

// Calculate discount amount for points redemption
export const calculateRedemptionDiscount = (subtotal: number): number => {
  return subtotal * REDEMPTION_DISCOUNT_PERCENT
}

// Check if customer can redeem points
export const canRedeemPoints = (customerPoints: number): boolean => {
  return customerPoints >= POINTS_FOR_REDEMPTION
}

// Process rewards for an order
export const processOrderRewards = async (
  customer: Customer,
  orderSubtotal: number,
  orderId: string,
  useRedemption = false,
): Promise<{
  pointsEarned: number
  pointsRedeemed: number
  discountAmount: number
  newPointsBalance: number
}> => {
  try {
    console.log("🎁 Processing order rewards:", { customer, orderSubtotal, orderId, useRedemption })

    let discountAmount = 0
    let pointsRedeemed = 0
    let adjustedSubtotal = orderSubtotal

    // Apply redemption if requested and customer has enough points
    if (useRedemption && canRedeemPoints(customer.rewardsPoints)) {
      discountAmount = calculateRedemptionDiscount(orderSubtotal)
      pointsRedeemed = POINTS_FOR_REDEMPTION
      adjustedSubtotal = orderSubtotal - discountAmount
    }

    // Calculate points earned on the adjusted subtotal (after discount)
    const pointsEarned = calculatePointsEarned(adjustedSubtotal)

    // Calculate new points balance
    const newPointsBalance = customer.rewardsPoints - pointsRedeemed + pointsEarned

    // Update customer points in Firebase
    if (customer.id) {
      await updateCustomerPoints(customer.id, newPointsBalance)

      // Record the transaction
      await recordRewardsTransaction({
        customerId: customer.id,
        orderId,
        pointsEarned,
        pointsRedeemed,
        discountAmount,
        orderSubtotal,
      })
    }

    const result = {
      pointsEarned,
      pointsRedeemed,
      discountAmount,
      newPointsBalance,
    }

    console.log("✅ Order rewards processed:", result)
    return result
  } catch (error) {
    console.error("❌ Error processing order rewards:", error)
    throw new Error(`Failed to process order rewards: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}

// Get customer rewards history
export const getCustomerRewardsHistory = async (customerId: string): Promise<RewardsTransaction[]> => {
  try {
    console.log("📊 Fetching customer rewards history:", customerId)

    const transactionsRef = collection(db, REWARDS_TRANSACTIONS_COLLECTION)
    const q = query(transactionsRef, where("customerId", "==", customerId), orderBy("createdAt", "desc"), limit(50))

    const snapshot = await getDocs(q)
    const transactions: RewardsTransaction[] = []

    snapshot.forEach((doc) => {
      const data = doc.data()
      transactions.push({
        ...data,
        createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : data.createdAt,
      } as RewardsTransaction)
    })

    console.log("✅ Retrieved rewards history:", transactions.length, "transactions")
    return transactions
  } catch (error) {
    console.error("❌ Error fetching rewards history:", error)
    throw new Error(`Failed to fetch rewards history: ${error instanceof Error ? error.message : "Unknown error"}`)
  }
}
