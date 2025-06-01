import { collection, getDocs, addDoc, updateDoc, doc } from "firebase/firestore"
import { db } from "./firebase"
import type { Customer } from "./rewards"

interface LegacyCustomerData {
  name: string
  contact: string
  phone: string
  email: string
  orders: any[]
  totalSpent: number
  totalOrders: number
  pointsEarned: number
  pointsRedeemed: number
  netPoints: number
}

// Function to migrate all legacy customers from orders to customers collection
export async function migrateAllCustomers(): Promise<{
  migrated: number
  updated: number
  errors: string[]
  summary: LegacyCustomerData[]
}> {
  console.log("🔄 Starting customer migration process...")

  const results = {
    migrated: 0,
    updated: 0,
    errors: [] as string[],
    summary: [] as LegacyCustomerData[],
  }

  try {
    // Step 1: Get all existing customers
    const existingCustomers = new Map<string, Customer>()
    const customersRef = collection(db, "customers")
    const customersSnapshot = await getDocs(customersRef)

    customersSnapshot.forEach((doc) => {
      const data = doc.data()
      const customerName = (data.customerName || data.name || "").toLowerCase().trim()
      if (customerName) {
        existingCustomers.set(customerName, {
          id: doc.id,
          name: data.customerName || data.name,
          phone: data.phone || "",
          email: data.email || "",
          rewardsPoints: data.rewardsPoints || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        })
      }
    })

    console.log(`📊 Found ${existingCustomers.size} existing customers`)

    // Step 2: Get all orders and group by customer
    const ordersRef = collection(db, "orders")
    const ordersSnapshot = await getDocs(ordersRef)

    const customerOrderMap = new Map<string, LegacyCustomerData>()

    ordersSnapshot.forEach((doc) => {
      const order = doc.data()
      const customerName = (order.customerName || "").trim()
      const customerContact = order.customerContact || ""

      if (!customerName) return

      const normalizedName = customerName.toLowerCase().trim()

      // Extract phone and email from contact
      const isEmail = customerContact.includes("@")
      const phone = isEmail ? "" : customerContact.replace(/\D/g, "")
      const email = isEmail ? customerContact.toLowerCase().trim() : ""

      if (!customerOrderMap.has(normalizedName)) {
        customerOrderMap.set(normalizedName, {
          name: customerName,
          contact: customerContact,
          phone: phone,
          email: email,
          orders: [],
          totalSpent: 0,
          totalOrders: 0,
          pointsEarned: 0,
          pointsRedeemed: 0,
          netPoints: 0,
        })
      }

      const customerData = customerOrderMap.get(normalizedName)!
      customerData.orders.push(order)
      customerData.totalSpent += order.finalTotal || 0
      customerData.totalOrders += 1

      // Calculate points earned (1 point per $1 spent on pre-tax subtotal)
      const pointsFromOrder = Math.floor(order.preTaxSubtotal || order.finalTotal || 0)
      customerData.pointsEarned += pointsFromOrder

      // Add points redeemed
      customerData.pointsRedeemed += order.pointsRedeemed || 0
    })

    console.log(`📊 Found ${customerOrderMap.size} unique customers from orders`)

    // Step 3: Process each customer
    for (const [normalizedName, customerData] of customerOrderMap.entries()) {
      try {
        customerData.netPoints = Math.max(0, customerData.pointsEarned - customerData.pointsRedeemed)
        results.summary.push(customerData)

        const existingCustomer = existingCustomers.get(normalizedName)

        if (existingCustomer) {
          // Customer exists - update their points if different
          if (existingCustomer.rewardsPoints !== customerData.netPoints) {
            console.log(
              `🔄 Updating ${customerData.name}: ${existingCustomer.rewardsPoints} → ${customerData.netPoints} points`,
            )

            const customerRef = doc(db, "customers", existingCustomer.id)
            await updateDoc(customerRef, {
              rewardsPoints: customerData.netPoints,
              updatedAt: new Date().toISOString(),
              // Update contact info if missing
              ...(customerData.phone && !existingCustomer.phone && { phone: customerData.phone }),
              ...(customerData.email && !existingCustomer.email && { email: customerData.email }),
            })

            results.updated++
          }
        } else {
          // Customer doesn't exist - create new record
          console.log(`➕ Creating new customer: ${customerData.name} with ${customerData.netPoints} points`)

          const newCustomerData = {
            customerName: customerData.name,
            name: customerData.name,
            phone: customerData.phone,
            email: customerData.email,
            rewardsPoints: customerData.netPoints,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }

          await addDoc(customersRef, newCustomerData)
          results.migrated++
        }
      } catch (error) {
        const errorMsg = `Failed to process ${customerData.name}: ${error instanceof Error ? error.message : "Unknown error"}`
        console.error("❌", errorMsg)
        results.errors.push(errorMsg)
      }
    }

    console.log("✅ Customer migration completed!")
    console.log(`📊 Summary: ${results.migrated} migrated, ${results.updated} updated, ${results.errors.length} errors`)

    return results
  } catch (error) {
    console.error("❌ Migration failed:", error)
    results.errors.push(`Migration failed: ${error instanceof Error ? error.message : "Unknown error"}`)
    return results
  }
}

// Function to get migration preview without making changes
export async function previewCustomerMigration(): Promise<{
  existingCustomers: number
  customersFromOrders: number
  needsMigration: number
  needsUpdate: number
  preview: Array<{
    name: string
    status: "exists" | "new" | "needs_update"
    currentPoints?: number
    calculatedPoints: number
    totalSpent: number
    totalOrders: number
  }>
}> {
  console.log("🔍 Previewing customer migration...")

  // Get existing customers
  const existingCustomers = new Map<string, Customer>()
  const customersRef = collection(db, "customers")
  const customersSnapshot = await getDocs(customersRef)

  customersSnapshot.forEach((doc) => {
    const data = doc.data()
    const customerName = (data.customerName || data.name || "").toLowerCase().trim()
    if (customerName) {
      existingCustomers.set(customerName, {
        id: doc.id,
        name: data.customerName || data.name,
        phone: data.phone || "",
        email: data.email || "",
        rewardsPoints: data.rewardsPoints || 0,
        createdAt: data.createdAt,
        updatedAt: data.updatedAt,
      })
    }
  })

  // Get customers from orders
  const ordersRef = collection(db, "orders")
  const ordersSnapshot = await getDocs(ordersRef)

  const customerOrderMap = new Map<string, any>()

  ordersSnapshot.forEach((doc) => {
    const order = doc.data()
    const customerName = (order.customerName || "").trim()

    if (!customerName) return

    const normalizedName = customerName.toLowerCase().trim()

    if (!customerOrderMap.has(normalizedName)) {
      customerOrderMap.set(normalizedName, {
        name: customerName,
        orders: [],
        totalSpent: 0,
        totalOrders: 0,
        pointsEarned: 0,
        pointsRedeemed: 0,
      })
    }

    const customerData = customerOrderMap.get(normalizedName)!
    customerData.orders.push(order)
    customerData.totalSpent += order.finalTotal || 0
    customerData.totalOrders += 1
    customerData.pointsEarned += Math.floor(order.preTaxSubtotal || order.finalTotal || 0)
    customerData.pointsRedeemed += order.pointsRedeemed || 0
  })

  // Create preview
  const preview = []
  let needsMigration = 0
  let needsUpdate = 0

  for (const [normalizedName, orderData] of customerOrderMap.entries()) {
    const calculatedPoints = Math.max(0, orderData.pointsEarned - orderData.pointsRedeemed)
    const existingCustomer = existingCustomers.get(normalizedName)

    if (existingCustomer) {
      if (existingCustomer.rewardsPoints !== calculatedPoints) {
        needsUpdate++
        preview.push({
          name: orderData.name,
          status: "needs_update" as const,
          currentPoints: existingCustomer.rewardsPoints,
          calculatedPoints,
          totalSpent: orderData.totalSpent,
          totalOrders: orderData.totalOrders,
        })
      } else {
        preview.push({
          name: orderData.name,
          status: "exists" as const,
          currentPoints: existingCustomer.rewardsPoints,
          calculatedPoints,
          totalSpent: orderData.totalSpent,
          totalOrders: orderData.totalOrders,
        })
      }
    } else {
      needsMigration++
      preview.push({
        name: orderData.name,
        status: "new" as const,
        calculatedPoints,
        totalSpent: orderData.totalSpent,
        totalOrders: orderData.totalOrders,
      })
    }
  }

  return {
    existingCustomers: existingCustomers.size,
    customersFromOrders: customerOrderMap.size,
    needsMigration,
    needsUpdate,
    preview: preview.sort((a, b) => b.totalSpent - a.totalSpent),
  }
}
