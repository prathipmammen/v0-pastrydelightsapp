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

// Comprehensive customer search with multiple strategies
export async function findCustomers(name: string, phone: string, email: string): Promise<CustomerMatch[]> {
  try {
    console.log("🔍 Comprehensive customer search:", { name, phone, email })

    const customersRef = collection(db, "customers")
    const normalizedName = normalizeName(name)
    const normalizedPhone = normalizePhone(phone)
    const normalizedEmail = normalizeEmail(email)

    const matches: CustomerMatch[] = []
    const seenCustomerIds = new Set<string>()

    // Strategy 1: Exact name match (if full name provided)
    if (hasFullName(name)) {
      console.log("📝 Searching by full name:", normalizedName)

      const nameQuery = query(
        customersRef,
        where("name", ">=", normalizedName),
        where("name", "<=", normalizedName + "\uf8ff"),
      )

      const nameSnapshot = await getDocs(nameQuery)

      for (const docSnap of nameSnapshot.docs) {
        const data = docSnap.data()
        if (normalizeName(data.name) === normalizedName) {
          const customer: Customer = {
            id: docSnap.id,
            name: data.name,
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
      }
    }

    // Strategy 2: Phone number match
    if (normalizedPhone && normalizedPhone.length >= 10) {
      console.log("📞 Searching by phone:", normalizedPhone)

      const phoneQuery = query(customersRef, where("phone", "==", normalizedPhone))
      const phoneSnapshot = await getDocs(phoneQuery)

      for (const docSnap of phoneSnapshot.docs) {
        if (!seenCustomerIds.has(docSnap.id)) {
          const data = docSnap.data()
          const customer: Customer = {
            id: docSnap.id,
            name: data.name,
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

    // Strategy 3: Email match
    if (normalizedEmail && normalizedEmail.includes("@")) {
      console.log("📧 Searching by email:", normalizedEmail)

      const emailQuery = query(customersRef, where("email", "==", normalizedEmail))
      const emailSnapshot = await getDocs(emailQuery)

      for (const docSnap of emailSnapshot.docs) {
        if (!seenCustomerIds.has(docSnap.id)) {
          const data = docSnap.data()
          const customer: Customer = {
            id: docSnap.id,
            name: data.name,
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

    // Strategy 4: Fuzzy name matching for partial names
    if (name && !hasFullName(name) && name.length >= 2) {
      console.log("🔤 Fuzzy name search for:", name)

      const fuzzyQuery = query(
        customersRef,
        where("name", ">=", normalizedName),
        where("name", "<=", normalizedName + "\uf8ff"),
      )

      const fuzzySnapshot = await getDocs(fuzzyQuery)

      for (const docSnap of fuzzySnapshot.docs) {
        if (!seenCustomerIds.has(docSnap.id)) {
          const data = docSnap.data()
          const customerName = normalizeName(data.name)

          // Check if the entered name is contained in the customer's name
          if (customerName.includes(normalizedName) || normalizedName.includes(customerName)) {
            const customer: Customer = {
              id: docSnap.id,
              name: data.name,
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

// Simplified function that returns the best match or null
export async function findCustomer(name: string, phone: string, email: string): Promise<Customer | null> {
  const matches = await findCustomers(name, phone, email)

  if (matches.length === 0) {
    return null
  }

  // If we have multiple high-confidence matches, we might need disambiguation
  // For now, return the first (best) match
  return matches[0].customer
}

// Create a new customer in Firestore
export async function createCustomer(name: string, phone: string, email: string): Promise<Customer> {
  try {
    console.log("👤 Creating new customer:", { name, phone, email })

    // Normalize the data before storing
    const customerData = {
      name: name.trim(),
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
      name: customerData.name,
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

// Update customer rewards points in Firestore
export async function updateCustomerRewards(customerId: string, newPointsBalance: number): Promise<void> {
  try {
    console.log("🔄 Updating customer rewards:", { customerId, newPointsBalance })

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

  // Update customer rewards in Firestore
  await updateCustomerRewards(customer.id, newPointsBalance)

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
