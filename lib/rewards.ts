import { collection, query, where, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "./firebase"

// Define customer type
export interface Customer {
  id: string
  name: string
  phone: string
  email: string
  rewardsPoints: number
  createdAt?: string
  updatedAt?: string
}

// Define customer match result for disambiguation
export interface CustomerMatch {
  customer: Customer
  matchType: "name" | "phone" | "email" | "name_phone" | "name_email" | "all"
  confidence: "high" | "medium" | "low"
}

// Constants for rewards program
export const POINTS_FOR_REDEMPTION = 100
export const REDEMPTION_DISCOUNT_PERCENT = 0.1 // 10%

// Check if customer has enough points to redeem
export function canRedeemPoints(points: number): boolean {
  return points >= POINTS_FOR_REDEMPTION
}

// Calculate points earned from an order (1 point per $1 spent, rounded down)
export function calculatePointsEarned(subtotal: number): number {
  return Math.floor(subtotal)
}

// Helper function to normalize names for comparison
function normalizeName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ")
}

// Helper function to normalize phone numbers
function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "") // Remove all non-digits
}

// Helper function to normalize email
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

// Helper function to check if a name contains both first and last name
function hasFullName(name: string): boolean {
  const trimmed = name.trim()
  const parts = trimmed.split(/\s+/)
  return parts.length >= 2 && parts.every((part) => part.length > 0)
}

// Helper function to mask sensitive information for display
function maskPhone(phone: string): string {
  if (phone.length < 4) return phone
  return phone.slice(0, 3) + "*".repeat(phone.length - 6) + phone.slice(-3)
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@")
  if (!domain) return email
  const maskedLocal = local.length > 2 ? local[0] + "*".repeat(local.length - 2) + local.slice(-1) : local
  return `${maskedLocal}@${domain}`
}

// Enhanced function to search for customers by looking in both customers collection and orders
export async function findCustomers(name: string, phone: string, email: string): Promise<CustomerMatch[]> {
  try {
    console.log("🔍 Comprehensive customer search:", { name, phone, email })

    const normalizedName = normalizeName(name)
    const normalizedPhone = normalizePhone(phone)
    const normalizedEmail = normalizeEmail(email)

    const matches: CustomerMatch[] = []
    const seenCustomerIds = new Set<string>()

    // Strategy 1: Search in customers collection
    await searchInCustomersCollection(normalizedName, normalizedPhone, normalizedEmail, matches, seenCustomerIds)

    // Strategy 2: Search in orders collection for customer names (fallback for legacy data)
    if (matches.length === 0 && normalizedName) {
      await searchInOrdersCollection(normalizedName, normalizedPhone, normalizedEmail, matches, seenCustomerIds)
    }

    // Sort matches by confidence and match type
    matches.sort((a, b) => {
      const confidenceOrder = { high: 3, medium: 2, low: 1 }
      const matchTypeOrder = { all: 6, name_email: 5, name_phone: 4, name: 3, email: 2, phone: 1 }

      const confidenceDiff = confidenceOrder[b.confidence] - confidenceOrder[a.confidence]
      if (confidenceDiff !== 0) return confidenceDiff

      return matchTypeOrder[b.matchType] - matchTypeOrder[a.matchType]
    })

    console.log(`✅ Found ${matches.length} customer matches`)
    return matches
  } catch (error) {
    console.error("❌ Error searching for customers:", error)
    throw error
  }
}

// Enhanced search in the customers collection with better fuzzy matching
async function searchInCustomersCollection(
  normalizedName: string,
  normalizedPhone: string,
  normalizedEmail: string,
  matches: CustomerMatch[],
  seenCustomerIds: Set<string>,
) {
  const customersRef = collection(db, "customers")

  // Search by name (both exact and fuzzy)
  if (normalizedName && normalizedName.length >= 2) {
    console.log("📝 Searching customers collection by name:", normalizedName)

    // Try exact match first
    const exactNameQuery = query(customersRef, where("customerName", "==", normalizedName))
    const exactNameSnapshot = await getDocs(exactNameQuery)

    for (const docSnap of exactNameSnapshot.docs) {
      const data = docSnap.data()
      const customer: Customer = {
        id: docSnap.id,
        name: data.customerName || data.name,
        phone: data.phone || "",
        email: data.email || "",
        rewardsPoints: data.rewardsPoints || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      }

      matches.push({
        customer,
        matchType: "name",
        confidence: "high",
      })
      seenCustomerIds.add(docSnap.id)
    }

    // If no exact match, try fuzzy search
    if (exactNameSnapshot.empty) {
      console.log("🔍 No exact customer match, trying fuzzy search...")

      // Get all customers and do client-side fuzzy matching
      const allCustomersQuery = query(customersRef)
      const allCustomersSnapshot = await getDocs(allCustomersQuery)

      for (const docSnap of allCustomersSnapshot.docs) {
        if (!seenCustomerIds.has(docSnap.id)) {
          const data = docSnap.data()
          const customerName = normalizeName(data.customerName || data.name || "")

          if (isNameMatch(normalizedName, customerName)) {
            const customer: Customer = {
              id: docSnap.id,
              name: data.customerName || data.name,
              phone: data.phone || "",
              email: data.email || "",
              rewardsPoints: data.rewardsPoints || 0,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            }

            matches.push({
              customer,
              matchType: "name",
              confidence: "medium",
            })
            seenCustomerIds.add(docSnap.id)
          }
        }
      }
    }
  }

  // Search by phone (existing logic)
  if (normalizedPhone && normalizedPhone.length >= 10) {
    console.log("📞 Searching customers collection by phone:", normalizedPhone)

    const phoneQuery = query(customersRef, where("phone", "==", normalizedPhone))
    const phoneSnapshot = await getDocs(phoneQuery)

    for (const docSnap of phoneSnapshot.docs) {
      if (!seenCustomerIds.has(docSnap.id)) {
        const data = docSnap.data()
        const customer: Customer = {
          id: docSnap.id,
          name: data.customerName || data.name,
          phone: data.phone || "",
          email: data.email || "",
          rewardsPoints: data.rewardsPoints || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }

        matches.push({
          customer,
          matchType: "phone",
          confidence: "high",
        })
        seenCustomerIds.add(docSnap.id)
      }
    }
  }

  // Search by email (existing logic)
  if (normalizedEmail && normalizedEmail.includes("@")) {
    console.log("📧 Searching customers collection by email:", normalizedEmail)

    const emailQuery = query(customersRef, where("email", "==", normalizedEmail))
    const emailSnapshot = await getDocs(emailQuery)

    for (const docSnap of emailSnapshot.docs) {
      if (!seenCustomerIds.has(docSnap.id)) {
        const data = docSnap.data()
        const customer: Customer = {
          id: docSnap.id,
          name: data.customerName || data.name,
          phone: data.phone || "",
          email: data.email || "",
          rewardsPoints: data.rewardsPoints || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        }

        matches.push({
          customer,
          matchType: "email",
          confidence: "high",
        })
        seenCustomerIds.add(docSnap.id)
      }
    }
  }
}

// Enhanced search in orders collection with better name matching
async function searchInOrdersCollection(
  normalizedName: string,
  normalizedPhone: string,
  normalizedEmail: string,
  matches: CustomerMatch[],
  seenCustomerIds: Set<string>,
) {
  console.log("🔍 Searching orders collection for customer:", normalizedName)

  const ordersRef = collection(db, "orders")
  const customerData = new Map<string, { orders: any[]; totalSpent: number }>()

  // Strategy 1: Exact name match
  const exactNameQuery = query(ordersRef, where("customerName", "==", normalizedName))
  const exactNameSnapshot = await getDocs(exactNameQuery)

  for (const docSnap of exactNameSnapshot.docs) {
    const data = docSnap.data()
    processOrderMatch(data, customerData, "exact")
  }

  // Strategy 2: Case-insensitive fuzzy search if no exact matches
  if (exactNameSnapshot.empty) {
    console.log("🔍 No exact matches, trying fuzzy search...")

    // Get all orders and do client-side filtering for better matching
    const allOrdersQuery = query(ordersRef)
    const allOrdersSnapshot = await getDocs(allOrdersQuery)

    for (const docSnap of allOrdersSnapshot.docs) {
      const data = docSnap.data()
      const orderCustomerName = normalizeName(data.customerName || "")

      // Check for various matching patterns
      if (isNameMatch(normalizedName, orderCustomerName)) {
        processOrderMatch(data, customerData, "fuzzy")
      }
    }
  }

  // Convert order data to customer matches
  for (const [customerKey, info] of customerData.entries()) {
    const firstOrder = info.orders[0]
    const rewardsPoints = Math.floor(info.totalSpent) // 1 point per $1 spent

    // Extract phone/email from customerContact
    const contact = firstOrder.customerContact || ""
    const isEmail = contact.includes("@")
    const phone = isEmail ? "" : normalizePhone(contact)
    const email = isEmail ? normalizeEmail(contact) : ""

    const customer: Customer = {
      id: `legacy_${customerKey}`, // Temporary ID for legacy customers
      name: firstOrder.customerName,
      phone: phone,
      email: email,
      rewardsPoints: rewardsPoints,
      createdAt: firstOrder.createdAt,
    }

    matches.push({
      customer,
      matchType: "name",
      confidence: customerKey.includes("exact") ? "high" : "medium",
    })
  }
}

// Helper function to process order matches
function processOrderMatch(data: any, customerData: Map<string, any>, matchType: string) {
  const orderCustomerName = normalizeName(data.customerName || "")
  const customerKey = `${matchType}_${orderCustomerName}_${data.customerContact || ""}`

  if (!customerData.has(customerKey)) {
    customerData.set(customerKey, { orders: [], totalSpent: 0 })
  }

  const customerInfo = customerData.get(customerKey)!
  customerInfo.orders.push(data)
  customerInfo.totalSpent += data.finalTotal || 0
}

// Enhanced name matching function
function isNameMatch(searchName: string, customerName: string): boolean {
  const searchParts = searchName.split(" ").filter((part) => part.length > 0)
  const customerParts = customerName.split(" ").filter((part) => part.length > 0)

  // If search is just one word, check if it matches any part of the customer name
  if (searchParts.length === 1) {
    const searchTerm = searchParts[0]
    return customerParts.some(
      (part) =>
        part.includes(searchTerm) ||
        searchTerm.includes(part) ||
        part.startsWith(searchTerm) ||
        searchTerm.startsWith(part),
    )
  }

  // If search has multiple words, check for partial matches
  if (searchParts.length >= 2) {
    // Check if all search parts have matches in customer name
    return searchParts.every((searchPart) =>
      customerParts.some(
        (customerPart) =>
          customerPart.includes(searchPart) ||
          searchPart.includes(customerPart) ||
          customerPart.startsWith(searchPart) ||
          searchPart.startsWith(customerPart),
      ),
    )
  }

  return false
}

// Simplified function that returns the best match or null
export async function findCustomer(name: string, phone: string, email: string): Promise<Customer | null> {
  const matches = await findCustomers(name, phone, email)

  if (matches.length === 0) {
    return null
  }

  // Return the first (best) match
  return matches[0].customer
}

// Create a new customer in Firestore
export async function createCustomer(name: string, phone: string, email: string): Promise<Customer> {
  try {
    console.log("👤 Creating new customer:", { name, phone, email })

    // Normalize the data before storing
    const customerData = {
      customerName: name.trim(), // Use customerName to match orders collection
      name: name.trim(), // Also store as name for compatibility
      phone: normalizePhone(phone),
      email: normalizeEmail(email),
      rewardsPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }

    const docRef = await addDoc(collection(db, "customers"), customerData)
    console.log("✅ Customer created with ID:", docRef.id)

    return {
      id: docRef.id,
      name: customerData.customerName,
      phone: customerData.phone,
      email: customerData.email,
      rewardsPoints: 0,
      createdAt: customerData.createdAt,
      updatedAt: customerData.updatedAt,
    }
  } catch (error) {
    console.error("❌ Error creating customer:", error)
    throw error
  }
}

// Update customer contact information in Firestore
export async function updateCustomerContact(customerId: string, newPhone: string, newEmail: string): Promise<Customer> {
  try {
    console.log("🔄 Updating customer contact:", { customerId, newPhone, newEmail })

    // Handle legacy customers (those found in orders but not in customers collection)
    if (customerId.startsWith("legacy_")) {
      console.log("🔄 Legacy customer detected, cannot update contact directly")
      throw new Error("Cannot update contact for legacy customer. Please create a new customer record.")
    }

    const customerRef = doc(db, "customers", customerId)
    const updateData: any = {
      updatedAt: new Date().toISOString(),
    }

    if (newPhone) {
      updateData.phone = normalizePhone(newPhone)
    }
    if (newEmail) {
      updateData.email = normalizeEmail(newEmail)
    }

    await updateDoc(customerRef, updateData)

    // Fetch the updated customer data
    const updatedSnapshot = await getDocs(query(collection(db, "customers"), where("__name__", "==", customerId)))
    const updatedData = updatedSnapshot.docs[0].data()

    const updatedCustomer: Customer = {
      id: customerId,
      name: updatedData.customerName || updatedData.name,
      phone: updatedData.phone || "",
      email: updatedData.email || "",
      rewardsPoints: updatedData.rewardsPoints || 0,
      createdAt: updatedData.createdAt,
      updatedAt: updatedData.updatedAt,
    }

    console.log("✅ Customer contact updated successfully")
    return updatedCustomer
  } catch (error) {
    console.error("❌ Error updating customer contact:", error)
    throw error
  }
}

// Update customer rewards points in Firestore
export async function updateCustomerRewards(customerId: string, newPointsBalance: number): Promise<void> {
  try {
    console.log("🔄 Updating customer rewards:", { customerId, newPointsBalance })

    // Handle legacy customers (those found in orders but not in customers collection)
    if (customerId.startsWith("legacy_")) {
      console.log("🔄 Legacy customer detected, creating new customer record")
      // For legacy customers, we'll need to create a proper customer record
      // This will be handled in the processOrderRewards function
      return
    }

    const customerRef = doc(db, "customers", customerId)
    await updateDoc(customerRef, {
      rewardsPoints: newPointsBalance,
      updatedAt: new Date().toISOString(),
    })

    console.log("✅ Customer rewards updated successfully")
  } catch (error) {
    console.error("❌ Error updating customer rewards:", error)
    throw error
  }
}

// Process rewards for an order
export async function processOrderRewards(
  customer: Customer,
  orderSubtotal: number,
  orderId: string,
  useRedemption: boolean,
): Promise<{
  pointsEarned: number
  pointsRedeemed: number
  discountAmount: number
  newPointsBalance: number
}> {
  // Calculate points earned (1 point per $1 spent, rounded down)
  const pointsEarned = calculatePointsEarned(orderSubtotal)

  // Calculate redemption
  const pointsRedeemed = useRedemption ? POINTS_FOR_REDEMPTION : 0
  const discountAmount = useRedemption ? orderSubtotal * REDEMPTION_DISCOUNT_PERCENT : 0

  // Calculate new balance using the correct formula:
  // New Balance = (Current Balance - Redeemed Points) + Points Earned
  const newPointsBalance = customer.rewardsPoints - pointsRedeemed + pointsEarned

  // Handle legacy customers by creating a proper customer record
  if (customer.id.startsWith("legacy_")) {
    console.log("🔄 Converting legacy customer to proper customer record")
    const newCustomer = await createCustomer(customer.name, customer.phone, customer.email)

    // Update the customer object with the new ID and points
    customer.id = newCustomer.id
    await updateCustomerRewards(customer.id, newPointsBalance)
  } else {
    // Update customer rewards in Firestore
    await updateCustomerRewards(customer.id, newPointsBalance)
  }

  return {
    pointsEarned,
    pointsRedeemed,
    discountAmount,
    newPointsBalance,
  }
}

// Helper function to format customer display information
export function formatCustomerDisplay(customer: Customer): string {
  const parts = []
  if (customer.name) parts.push(customer.name)
  if (customer.phone) parts.push(`📞 ${maskPhone(customer.phone)}`)
  if (customer.email) parts.push(`📧 ${maskEmail(customer.email)}`)
  return parts.join(" • ")
}
