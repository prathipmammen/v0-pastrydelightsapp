"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  Calendar,
  Package,
  Receipt,
  TrendingUp,
  History,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  CheckCircle,
  User,
  UserPlus,
  Users,
  Info,
  Edit,
  Phone,
  Mail,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { addOrder, prepareOrderForFirestore } from "@/lib/firestore"
import {
  findCustomers,
  createCustomer,
  processOrderRewards,
  calculatePointsEarned,
  formatCustomerDisplay,
  updateCustomerContact,
  type Customer,
  type CustomerMatch,
} from "@/lib/rewards"
import FirebaseBanner from "@/components/firebase-banner"
import RewardsDisplay from "@/components/rewards-display"

interface PuffItem {
  id: string
  category: string
  type: string
  price: number
  quantity: number
  defaultPrice: number
}

export default function PastryOrderSystem() {
  const [customerName, setCustomerName] = useState("")
  const [phoneEmail, setPhoneEmail] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [pickupTime, setPickupTime] = useState("")
  const [deliveryRequired, setDeliveryRequired] = useState("No - Pickup Only")
  const [deliveryFee, setDeliveryFee] = useState("5.00")
  const [deliveryAddress, setDeliveryAddress] = useState("2009 overton dr, Prosper TEXAS")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [discount, setDiscount] = useState("0%")
  const [puffItems, setPuffItems] = useState<PuffItem[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Enhanced customer lookup state
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [useRewardsRedemption, setUseRewardsRedemption] = useState(false)
  const [customerMatches, setCustomerMatches] = useState<CustomerMatch[]>([])
  const [showCustomerSelection, setShowCustomerSelection] = useState(false)
  const [customerLookupMessage, setCustomerLookupMessage] = useState<{
    type: "found" | "new" | "multiple" | "insufficient" | "error" | "searching" | "update_contact"
    text: string
  } | null>(null)

  // New state for contact update prompt
  const [showContactUpdatePrompt, setShowContactUpdatePrompt] = useState(false)
  const [contactUpdateInfo, setContactUpdateInfo] = useState<{
    customer: Customer
    newPhone: string
    newEmail: string
    contactType: "phone" | "email"
  } | null>(null)

  const router = useRouter()

  // Helper function to check if name has both first and last name
  const hasFullName = (name: string): boolean => {
    const trimmed = name.trim()
    const parts = trimmed.split(/\s+/)
    return parts.length >= 2 && parts.every((part) => part.length > 0)
  }

  // Enhanced customer search with contact update detection
  useEffect(() => {
    const searchCustomers = async () => {
      const trimmedName = customerName.trim()
      const trimmedContact = phoneEmail.trim()

      // Clear previous state
      setCustomer(null)
      setUseRewardsRedemption(false)
      setCustomerMatches([])
      setShowCustomerSelection(false)
      setCustomerLookupMessage(null)
      setShowContactUpdatePrompt(false)
      setContactUpdateInfo(null)

      // Don't search if no meaningful input
      if (!trimmedName && !trimmedContact) {
        return
      }

      // Check if we have enough information to search
      const hasMinimumInfo = trimmedName.length >= 2 || trimmedContact.length >= 3

      if (!hasMinimumInfo) {
        setCustomerLookupMessage({
          type: "insufficient",
          text: "Please enter at least 2 characters for name or 3+ for phone/email to search for existing customers.",
        })
        return
      }

      setIsLoadingCustomer(true)
      setCustomerLookupMessage({
        type: "searching",
        text: "Searching for existing customer records...",
      })

      try {
        // Extract phone and email from phoneEmail field
        const isEmail = trimmedContact.includes("@")
        const phone = isEmail ? "" : trimmedContact
        const email = isEmail ? trimmedContact : ""

        const matches = await findCustomers(trimmedName, phone, email)

        if (matches.length === 0) {
          // No matches found - new customer
          setCustomerLookupMessage({
            type: "new",
            text: "No existing customer found. A new customer account will be created with this order. You'll start earning reward points!",
          })
        } else if (matches.length === 1) {
          // Single match found - check if contact info needs updating
          const foundCustomer = matches[0].customer
          const needsContactUpdate = checkIfContactUpdateNeeded(foundCustomer, phone, email)

          if (needsContactUpdate) {
            // Show contact update prompt
            setContactUpdateInfo({
              customer: foundCustomer,
              newPhone: phone,
              newEmail: email,
              contactType: isEmail ? "email" : "phone",
            })
            setShowContactUpdatePrompt(true)
            setCustomerLookupMessage({
              type: "update_contact",
              text: `Customer found! Would you like to update their ${isEmail ? "email" : "phone number"}?`,
            })
          } else {
            // Customer found with matching contact info
            setCustomer(foundCustomer)
            setCustomerLookupMessage({
              type: "found",
              text: `Customer Found! Welcome back, ${foundCustomer.name}! You have ${foundCustomer.rewardsPoints} reward points.`,
            })
          }
        } else {
          // Multiple matches - show selection
          setCustomerMatches(matches)
          setShowCustomerSelection(true)
          setCustomerLookupMessage({
            type: "multiple",
            text: `Found ${matches.length} possible matches. Please select the correct customer below:`,
          })
        }
      } catch (error) {
        console.error("Error searching for customers:", error)
        setCustomerLookupMessage({
          type: "error",
          text: "Error searching for customer. Please try again or contact support.",
        })
      } finally {
        setIsLoadingCustomer(false)
      }
    }

    // Debounce the search
    const timeoutId = setTimeout(searchCustomers, 600)
    return () => clearTimeout(timeoutId)
  }, [customerName, phoneEmail])

  // Helper function to check if contact info needs updating
  const checkIfContactUpdateNeeded = (customer: Customer, newPhone: string, newEmail: string): boolean => {
    if (newPhone && customer.phone && customer.phone !== newPhone) {
      return true
    }
    if (newEmail && customer.email && customer.email !== newEmail) {
      return true
    }
    if (newPhone && !customer.phone) {
      return true
    }
    if (newEmail && !customer.email) {
      return true
    }
    return false
  }

  // Handle contact update confirmation
  const handleContactUpdate = async (updateContact: boolean) => {
    if (!contactUpdateInfo) return

    if (updateContact) {
      try {
        // Update customer contact information
        const updatedCustomer = await updateCustomerContact(
          contactUpdateInfo.customer.id,
          contactUpdateInfo.newPhone,
          contactUpdateInfo.newEmail,
        )

        setCustomer(updatedCustomer)
        setCustomerLookupMessage({
          type: "found",
          text: `Contact updated! Welcome back, ${updatedCustomer.name}! You have ${updatedCustomer.rewardsPoints} reward points.`,
        })
      } catch (error) {
        console.error("Error updating customer contact:", error)
        setCustomerLookupMessage({
          type: "error",
          text: "Failed to update contact information. Please try again.",
        })
      }
    } else {
      // Use customer without updating contact
      setCustomer(contactUpdateInfo.customer)
      setCustomerLookupMessage({
        type: "found",
        text: `Customer Found! Welcome back, ${contactUpdateInfo.customer.name}! You have ${contactUpdateInfo.customer.rewardsPoints} reward points.`,
      })
    }

    setShowContactUpdatePrompt(false)
    setContactUpdateInfo(null)
  }

  // Handle customer selection from multiple matches
  const handleCustomerSelection = (selectedCustomer: Customer) => {
    setCustomer(selectedCustomer)
    setShowCustomerSelection(false)
    setCustomerMatches([])
    setCustomerLookupMessage({
      type: "found",
      text: `Customer Selected! Welcome back, ${selectedCustomer.name}! You have ${selectedCustomer.rewardsPoints} reward points.`,
    })

    // Update form fields with selected customer data
    setCustomerName(selectedCustomer.name)
    if (selectedCustomer.phone && !phoneEmail.includes("@")) {
      setPhoneEmail(selectedCustomer.phone)
    } else if (selectedCustomer.email && phoneEmail.includes("@")) {
      setPhoneEmail(selectedCustomer.email)
    }
  }

  const addPuffItem = () => {
    const newItem: PuffItem = {
      id: Date.now().toString(),
      category: "",
      type: "",
      price: 0,
      quantity: 1,
      defaultPrice: 0,
    }
    setPuffItems([...puffItems, newItem])
  }

  const updatePuffItem = (id: string, field: keyof PuffItem, value: any) => {
    setPuffItems((items) => items.map((item) => (item.id === id ? { ...item, [field]: value } : item)))
  }

  const removePuffItem = (id: string) => {
    setPuffItems((items) => items.filter((item) => item.id !== id))
  }

  const updateQuantity = (id: string, change: number) => {
    setPuffItems((items) =>
      items.map((item) => (item.id === id ? { ...item, quantity: Math.max(1, item.quantity + change) } : item)),
    )
  }

  const puffSubtotal = puffItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFeeAmount = deliveryRequired.includes("Delivery") ? Number.parseFloat(deliveryFee) : 0
  const discountAmount = Number.parseFloat(discount.replace("%", "")) / 100
  const subtotalAfterDiscount = puffSubtotal * (1 - discountAmount)

  // Calculate rewards discount
  const rewardsDiscountAmount = useRewardsRedemption && customer ? subtotalAfterDiscount * 0.1 : 0
  const finalSubtotalAfterRewards = subtotalAfterDiscount - rewardsDiscountAmount

  const taxRate = 0.0825
  const taxAmount = finalSubtotalAfterRewards * taxRate
  const finalTotal = finalSubtotalAfterRewards + deliveryFeeAmount + taxAmount

  const categories = ["Savory", "Veggie", "Sweet"]

  const puffTypes = {
    Savory: [
      "Butter Chicken Puffs",
      "Chili Chicken Puffs",
      "Buffalo Chicken Puffs",
      "Barbacoa (slow-cooked, tender beef) Puffs with Consommé",
      "Cajun Alfredo Chicken with Sundried Tomatoes Puffs",
      "Bacon, Chicken & Pesto Puffs",
      "Brie, Prosciutto & Fig Jam Puffs",
    ],
    Veggie: [
      "Chickpea Masala Puffs",
      "Potato Masala Puffs",
      "Butter Paneer Puffs",
      "Chili-Infused Spinach and Feta Puffs",
    ],
    Sweet: [
      "Nutella Hazelnut Puffs",
      "Lemon Blackberry Cheesecake Puffs",
      "Berry Medley with Mascarpone and Lemon Curd Puffs",
      "Guava Cream Cheese Puffs",
      "Passion Fruit Mousse Puffs",
      "Dubai Chocolate Puffs",
    ],
  }

  const defaultPrices = {
    // Savory - Default $3.00
    "Butter Chicken Puffs": 3.0,
    "Chili Chicken Puffs": 3.0,
    "Buffalo Chicken Puffs": 3.0,
    "Barbacoa (slow-cooked, tender beef) Puffs with Consommé": 3.0,
    "Cajun Alfredo Chicken with Sundried Tomatoes Puffs": 3.0,
    "Bacon, Chicken & Pesto Puffs": 3.0,
    "Brie, Prosciutto & Fig Jam Puffs": 3.0,

    // Veggie - Default $2.75
    "Chickpea Masala Puffs": 2.75,
    "Potato Masala Puffs": 2.75,
    "Butter Paneer Puffs": 2.75,
    "Chili-Infused Spinach and Feta Puffs": 2.75,

    // Sweet - Default $3.30
    "Nutella Hazelnut Puffs": 3.3,
    "Lemon Blackberry Cheesecake Puffs": 3.3,
    "Berry Medley with Mascarpone and Lemon Curd Puffs": 3.3,
    "Guava Cream Cheese Puffs": 3.3,
    "Passion Fruit Mousse Puffs": 3.3,
    "Dubai Chocolate Puffs": 3.3,
  }

  const handleSubmitOrder = async () => {
    if (!customerName || !pickupDate || !pickupTime || !paymentMethod || puffItems.length === 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const receiptId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // Handle customer creation/lookup
      let currentCustomer = customer
      if (!currentCustomer) {
        // Extract phone and email from phoneEmail field
        const isEmail = phoneEmail.includes("@")
        const phone = isEmail ? "" : phoneEmail
        const email = isEmail ? phoneEmail : ""

        currentCustomer = await createCustomer(customerName, phone, email)
      }

      // Calculate tax - set to 0 for cash payments
      const isCashPayment = paymentMethod === "cash"
      const calculatedTaxRate = isCashPayment ? 0 : taxRate
      const calculatedTaxAmount = isCashPayment ? 0 : finalSubtotalAfterRewards * taxRate
      const calculatedFinalTotal = finalSubtotalAfterRewards + deliveryFeeAmount + calculatedTaxAmount

      // Process rewards
      const rewardsResult = await processOrderRewards(
        currentCustomer,
        subtotalAfterDiscount, // Use subtotal before rewards discount for points calculation
        receiptId,
        useRewardsRedemption,
      )

      const orderData = {
        receiptId,
        customerName,
        customerContact: phoneEmail || "Not provided",
        deliveryDate: pickupDate,
        deliveryTime: pickupTime,
        paymentMethod: paymentMethod || "Not provided",
        isDelivery: deliveryRequired.includes("Delivery"),
        deliveryAddress: deliveryRequired.includes("Delivery") ? deliveryAddress || "Not provided" : "",
        deliveryFee: deliveryRequired.includes("Delivery") ? Number.parseFloat(deliveryFee) : 0,
        items: puffItems.map((item) => ({
          name: item.type,
          category: item.category,
          quantity: item.quantity,
          unitPrice: item.price,
          total: item.price * item.quantity,
        })),
        puffSubtotal,
        discount: puffSubtotal * discountAmount,
        discountPercent: discount,
        preTaxSubtotal: subtotalAfterDiscount,
        tax: calculatedTaxAmount,
        taxRate: calculatedTaxRate,
        finalTotal: calculatedFinalTotal,
        isPaid: true,
        createdAt: new Date().toISOString(),
        // Rewards data
        customerId: currentCustomer.id,
        pointsEarned: rewardsResult.pointsEarned,
        pointsRedeemed: rewardsResult.pointsRedeemed,
        rewardsDiscountAmount: rewardsResult.discountAmount,
        customerRewardsBalance: rewardsResult.newPointsBalance,
      }

      // Save to Firestore
      const firestoreOrderData = prepareOrderForFirestore(orderData)
      const firestoreOrderId = await addOrder(firestoreOrderData)

      // Store updated order for receipt view
      const orderWithId = { ...orderData, firestoreId: firestoreOrderId }
      localStorage.setItem("currentOrder", JSON.stringify(orderWithId))

      setSubmitMessage({ type: "success", text: "✅ Order successfully saved to Firebase!" })

      // Navigate to receipt after a brief delay
      setTimeout(() => {
        router.push("/receipt")
      }, 1500)
    } catch (error) {
      console.error("Error submitting order:", error)
      setSubmitMessage({
        type: "error",
        text: `❌ Failed to save order: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsSubmitting(false)
    }
  }

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
        <FirebaseBanner />

        {/* Main Order Form */}
        <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200">
          <CardHeader className="bg-amber-100/95 border-b border-amber-200">
            <CardTitle className="flex flex-col sm:flex-row sm:items-center gap-2 text-amber-800">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                New Order
              </div>
              <span className="text-xs sm:text-sm font-normal text-amber-600">5/30/2025 • 12:39:49 PM</span>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-4 sm:space-y-6">
            {/* Customer Details */}
            <div>
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-800 mb-4">
                <span>👤</span> Customer Details
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="customerName" className="text-amber-800 text-sm flex items-center gap-2">
                    Customer Name *
                    <div className="group relative">
                      <Info className="w-3 h-3 text-amber-600 cursor-help" />
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-800 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        💡 Tip: Enter both first and last name for best results. If this customer has ordered before,
                        add their phone or email to ensure accurate rewards lookup.
                      </div>
                    </div>
                  </Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter full name (e.g., John Smith)"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneEmail" className="text-amber-800 text-sm">
                    Phone or Email
                  </Label>
                  <Input
                    id="phoneEmail"
                    value={phoneEmail}
                    onChange={(e) => setPhoneEmail(e.target.value)}
                    placeholder="Enter phone number or email address"
                    className="mt-1"
                  />
                  <div className="text-xs text-amber-600 mt-1">
                    {hasFullName(customerName)
                      ? "Optional - helps verify the correct customer"
                      : "Recommended for accurate customer lookup"}
                  </div>
                </div>

                {/* Customer lookup status messages */}
                {customerLookupMessage && (
                  <div
                    className={`p-3 border rounded-lg flex items-start gap-3 ${
                      customerLookupMessage.type === "found"
                        ? "bg-green-50 border-green-200"
                        : customerLookupMessage.type === "new"
                          ? "bg-blue-50 border-blue-200"
                          : customerLookupMessage.type === "multiple"
                            ? "bg-purple-50 border-purple-200"
                            : customerLookupMessage.type === "searching"
                              ? "bg-blue-50 border-blue-200"
                              : customerLookupMessage.type === "insufficient"
                                ? "bg-yellow-50 border-yellow-200"
                                : customerLookupMessage.type === "update_contact"
                                  ? "bg-orange-50 border-orange-200"
                                  : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      {customerLookupMessage.type === "found" && <User className="w-4 h-4 text-green-600" />}
                      {customerLookupMessage.type === "new" && <UserPlus className="w-4 h-4 text-blue-600" />}
                      {customerLookupMessage.type === "multiple" && <Users className="w-4 h-4 text-purple-600" />}
                      {customerLookupMessage.type === "update_contact" && <Edit className="w-4 h-4 text-orange-600" />}
                      {customerLookupMessage.type === "searching" && (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                      )}
                      {customerLookupMessage.type === "insufficient" && (
                        <AlertCircle className="w-4 h-4 text-yellow-600" />
                      )}
                      {customerLookupMessage.type === "error" && <AlertCircle className="w-4 h-4 text-red-600" />}
                    </div>
                    <div className="flex-1">
                      <div
                        className={`text-sm font-medium mb-1 ${
                          customerLookupMessage.type === "found"
                            ? "text-green-800"
                            : customerLookupMessage.type === "new"
                              ? "text-blue-800"
                              : customerLookupMessage.type === "multiple"
                                ? "text-purple-800"
                                : customerLookupMessage.type === "searching"
                                  ? "text-blue-800"
                                  : customerLookupMessage.type === "insufficient"
                                    ? "text-yellow-800"
                                    : customerLookupMessage.type === "update_contact"
                                      ? "text-orange-800"
                                      : "text-red-800"
                        }`}
                      >
                        {customerLookupMessage.type === "found" && "Customer Found!"}
                        {customerLookupMessage.type === "new" && "New Customer"}
                        {customerLookupMessage.type === "multiple" && "Multiple Customers Found"}
                        {customerLookupMessage.type === "searching" && "Searching..."}
                        {customerLookupMessage.type === "insufficient" && "More Information Needed"}
                        {customerLookupMessage.type === "update_contact" && "Update Contact Info?"}
                        {customerLookupMessage.type === "error" && "Search Error"}
                      </div>
                      <div
                        className={`text-sm ${
                          customerLookupMessage.type === "found"
                            ? "text-green-700"
                            : customerLookupMessage.type === "new"
                              ? "text-blue-700"
                              : customerLookupMessage.type === "multiple"
                                ? "text-purple-700"
                                : customerLookupMessage.type === "searching"
                                  ? "text-blue-700"
                                  : customerLookupMessage.type === "insufficient"
                                    ? "text-yellow-700"
                                    : customerLookupMessage.type === "update_contact"
                                      ? "text-orange-700"
                                      : "text-red-700"
                        }`}
                      >
                        {customerLookupMessage.text}
                      </div>
                    </div>
                  </div>
                )}

                {/* Contact Update Prompt */}
                {showContactUpdatePrompt && contactUpdateInfo && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3 mb-4">
                      <Edit className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-orange-800 mb-2">Update Customer Contact Information</h4>
                        <div className="text-sm text-orange-700 space-y-2">
                          <div>
                            <strong>Customer:</strong> {contactUpdateInfo.customer.name}
                          </div>
                          <div>
                            <strong>Current {contactUpdateInfo.contactType}:</strong>{" "}
                            {contactUpdateInfo.contactType === "phone"
                              ? contactUpdateInfo.customer.phone || "Not provided"
                              : contactUpdateInfo.customer.email || "Not provided"}
                          </div>
                          <div>
                            <strong>New {contactUpdateInfo.contactType}:</strong>{" "}
                            {contactUpdateInfo.contactType === "phone"
                              ? contactUpdateInfo.newPhone
                              : contactUpdateInfo.newEmail}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleContactUpdate(true)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700 text-white text-sm"
                        size="sm"
                      >
                        <div className="flex items-center gap-2">
                          {contactUpdateInfo.contactType === "phone" ? (
                            <Phone className="w-4 h-4" />
                          ) : (
                            <Mail className="w-4 h-4" />
                          )}
                          Yes, Update {contactUpdateInfo.contactType === "phone" ? "Phone" : "Email"}
                        </div>
                      </Button>
                      <Button
                        onClick={() => handleContactUpdate(false)}
                        variant="outline"
                        className="flex-1 border-orange-300 text-orange-700 hover:bg-orange-50 text-sm"
                        size="sm"
                      >
                        No, Keep Current Info
                      </Button>
                    </div>

                    <div className="mt-3 text-xs text-orange-600">
                      💡 Updating contact info helps ensure accurate customer records and better service.
                    </div>
                  </div>
                )}

                {/* Customer selection for multiple matches */}
                {showCustomerSelection && customerMatches.length > 0 && (
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <h4 className="font-medium text-purple-800 mb-3">Select the correct customer:</h4>
                    <div className="space-y-2">
                      {customerMatches.map((match, index) => (
                        <button
                          key={match.customer.id}
                          onClick={() => handleCustomerSelection(match.customer)}
                          className="w-full p-3 text-left bg-white border border-purple-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="font-medium text-gray-900">{formatCustomerDisplay(match.customer)}</div>
                              <div className="text-sm text-purple-600 mt-1">
                                {match.customer.rewardsPoints} reward points • Match: {match.matchType} (
                                {match.confidence} confidence)
                              </div>
                            </div>
                            <div className="text-xs text-gray-500">#{index + 1}</div>
                          </div>
                        </button>
                      ))}
                    </div>
                    <div className="mt-3 text-xs text-purple-600">
                      💡 Click on the customer that matches your order. If none match, you can continue to create a new
                      customer.
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Rewards Display - Now prominently placed after customer details */}
            {customer && !isLoadingCustomer && !showCustomerSelection && !showContactUpdatePrompt && (
              <RewardsDisplay
                customer={customer}
                orderSubtotal={subtotalAfterDiscount}
                onRedemptionToggle={setUseRewardsRedemption}
                useRedemption={useRewardsRedemption}
                isLoading={isLoadingCustomer}
              />
            )}

            {/* Pickup Details */}
            <div>
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-800 mb-4">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                Pickup Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickupDate" className="text-amber-800 text-sm">
                    Pickup Date *
                  </Label>
                  <Input
                    id="pickupDate"
                    type="date"
                    value={pickupDate}
                    onChange={(e) => setPickupDate(e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="pickupTime" className="text-amber-800 text-sm">
                    Pickup Time *
                  </Label>
                  <Input
                    id="pickupTime"
                    type="time"
                    value={pickupTime}
                    onChange={(e) => setPickupTime(e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Delivery Options */}
            <div>
              <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-800 mb-4">
                <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                Delivery Options
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-amber-800 text-sm">Delivery Required?</Label>
                  <Select value={deliveryRequired} onValueChange={setDeliveryRequired}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="No - Pickup Only">No - Pickup Only</SelectItem>
                      <SelectItem value="Yes - Delivery Required">Yes - Delivery Required</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {deliveryRequired.includes("Delivery") && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-amber-100/80 rounded-lg">
                    <div>
                      <Label className="text-amber-800 text-sm">Delivery Fee</Label>
                      <Input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-amber-800 text-sm">Delivery Address</Label>
                      <Input
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Add Puffs Section */}
            <div>
              <Button
                onClick={addPuffItem}
                variant="outline"
                className="w-full sm:w-auto flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4" />
                Add Puffs to Order
              </Button>
            </div>

            {/* Puff Items */}
            {puffItems.map((item) => (
              <div key={item.id} className="p-4 bg-white/90 rounded-lg border border-amber-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label className="text-amber-800 text-sm">Category</Label>
                    <Select
                      value={item.category}
                      onValueChange={(value) => {
                        updatePuffItem(item.id, "category", value)
                        updatePuffItem(item.id, "type", "")
                        // Set category default price immediately
                        const categoryDefaultPrice =
                          value === "Savory" ? 3.0 : value === "Sweet" ? 3.3 : value === "Veggie" ? 2.75 : 0
                        updatePuffItem(item.id, "price", categoryDefaultPrice)
                        updatePuffItem(item.id, "defaultPrice", categoryDefaultPrice)
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-amber-800 text-sm">Puff Type</Label>
                    <Select
                      value={item.type}
                      onValueChange={(value) => {
                        updatePuffItem(item.id, "type", value)
                        const defaultPrice = defaultPrices[value as keyof typeof defaultPrices] || 0
                        updatePuffItem(item.id, "price", defaultPrice)
                        updatePuffItem(item.id, "defaultPrice", defaultPrice)
                      }}
                      disabled={!item.category}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Choose category first" />
                      </SelectTrigger>
                      <SelectContent>
                        {item.category &&
                          puffTypes[item.category as keyof typeof puffTypes]?.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <Label className="text-amber-800 text-sm">Price</Label>
                    {item.category && !item.type && (
                      <div className="text-xs text-amber-600">
                        Category Default: $
                        {item.category === "Savory"
                          ? "3.00"
                          : item.category === "Sweet"
                            ? "3.30"
                            : item.category === "Veggie"
                              ? "2.75"
                              : "0.00"}
                      </div>
                    )}
                    {item.defaultPrice > 0 && item.type && (
                      <div className="text-xs text-amber-600">Default: ${item.defaultPrice.toFixed(2)}</div>
                    )}
                    <Input
                      type="number"
                      step="0.01"
                      value={item.price}
                      onChange={(e) => updatePuffItem(item.id, "price", Number.parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label className="text-amber-800 text-sm">Quantity</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => updateQuantity(item.id, -1)}
                        disabled={item.quantity <= 1}
                      >
                        <Minus className="w-3 h-3" />
                      </Button>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updatePuffItem(item.id, "quantity", Number.parseInt(e.target.value) || 1)}
                        className="w-16 text-center"
                        min="1"
                      />
                      <Button size="sm" variant="outline" onClick={() => updateQuantity(item.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => removePuffItem(item.id)}
                      className="w-full text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {puffItems.length > 0 && (
              <Button
                onClick={addPuffItem}
                variant="outline"
                className="w-full sm:w-auto flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4" />
                Add Another Puff
              </Button>
            )}

            {/* Enhanced Final Order Summary with detailed calculations */}
            {puffItems.length > 0 && (
              <div className="bg-white/90 p-4 sm:p-6 rounded-lg border border-amber-200">
                <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-800 mb-4 sm:mb-6">
                  📋 Order Calculation Breakdown
                </h3>

                {/* Individual Items */}
                <div className="space-y-2 mb-4">
                  <h4 className="font-medium text-amber-700 mb-2">Items Ordered:</h4>
                  {puffItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                      <span className="flex-1 pr-2">
                        {item.quantity}x {item.type} ({item.category}) @ ${item.price.toFixed(2)}
                      </span>
                      <span className="font-medium">${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Step-by-step calculations */}
                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span className="font-medium">1. Puff Subtotal:</span>
                    <span className="font-medium">${puffSubtotal.toFixed(2)}</span>
                  </div>

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>2. Discount ({discount}):</span>
                      <span>-${(puffSubtotal * discountAmount).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-amber-800 bg-amber-50 p-2 rounded">
                    <span>{discountAmount > 0 ? "3." : "2."} Subtotal After Discount:</span>
                    <span>${subtotalAfterDiscount.toFixed(2)}</span>
                  </div>

                  {useRewardsRedemption && rewardsDiscountAmount > 0 && (
                    <div className="flex justify-between text-purple-600">
                      <span>{discountAmount > 0 ? "4." : "3."} Rewards Redemption (10%):</span>
                      <span>-${rewardsDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {deliveryRequired.includes("Delivery") && (
                    <div className="flex justify-between text-blue-600">
                      <span>
                        {useRewardsRedemption ? (discountAmount > 0 ? "5." : "4.") : discountAmount > 0 ? "4." : "3."}{" "}
                        Delivery Fee:
                      </span>
                      <span>+${deliveryFeeAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>
                      {deliveryRequired.includes("Delivery")
                        ? useRewardsRedemption
                          ? discountAmount > 0
                            ? "6."
                            : "5."
                          : discountAmount > 0
                            ? "5."
                            : "4."
                        : useRewardsRedemption
                          ? discountAmount > 0
                            ? "5."
                            : "4."
                          : discountAmount > 0
                            ? "4."
                            : "3."}{" "}
                      Tax {paymentMethod === "cash" ? "(0% for Cash)" : "(8.25%)"}:
                    </span>
                    <span>+${paymentMethod === "cash" ? "0.00" : taxAmount.toFixed(2)}</span>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex justify-between text-lg sm:text-xl font-bold text-amber-800 bg-amber-100 p-3 rounded-lg">
                    <span>Final Total:</span>
                    <span>
                      $
                      {(paymentMethod === "cash" ? finalSubtotalAfterRewards + deliveryFeeAmount : finalTotal).toFixed(
                        2,
                      )}
                    </span>
                  </div>

                  {/* Points Preview */}
                  {customer && (
                    <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
                      <h4 className="flex items-center gap-2 font-medium text-purple-800 mb-2">🎁 Rewards Preview:</h4>
                      <div className="text-sm text-purple-700 space-y-1">
                        <div className="flex justify-between">
                          <span>Points you'll earn:</span>
                          <span className="font-medium">
                            +{calculatePointsEarned(finalSubtotalAfterRewards)} points
                          </span>
                        </div>
                        {useRewardsRedemption && (
                          <div className="flex justify-between">
                            <span>Points redeemed:</span>
                            <span className="font-medium">-100 points</span>
                          </div>
                        )}
                        <div className="flex justify-between font-semibold border-t border-purple-200 pt-1">
                          <span>New balance:</span>
                          <span>
                            {customer.rewardsPoints +
                              calculatePointsEarned(finalSubtotalAfterRewards) -
                              (useRewardsRedemption ? 100 : 0)}{" "}
                            points
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {deliveryRequired.includes("Delivery") && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="flex items-center gap-2 font-medium text-blue-800 mb-2">
                        🚚 Delivery Information:
                      </h4>
                      <div className="text-sm text-blue-700">
                        <div>
                          <strong>Address:</strong> {deliveryAddress}
                        </div>
                        <div>
                          <strong>Fee:</strong> ${deliveryFeeAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment and Discount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label className="text-amber-800 text-sm">Payment Method *</Label>
                <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select Payment Method" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="venmo">Venmo</SelectItem>
                    <SelectItem value="zelle">Zelle</SelectItem>
                    <SelectItem value="cash">Cash (No Tax)</SelectItem>
                    <SelectItem value="check">Check</SelectItem>
                  </SelectContent>
                </Select>
                {!paymentMethod && <p className="text-red-500 text-sm mt-1">⚠️ Payment method is required</p>}
              </div>

              <div>
                <Label className="text-amber-800 text-sm">Discount</Label>
                <Select value={discount} onValueChange={setDiscount}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0%">0%</SelectItem>
                    <SelectItem value="5%">5%</SelectItem>
                    <SelectItem value="10%">10%</SelectItem>
                    <SelectItem value="15%">15%</SelectItem>
                    <SelectItem value="20%">20%</SelectItem>
                    <SelectItem value="25%">25%</SelectItem>
                    <SelectItem value="30%">30%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Submit Button */}
            <div className="space-y-4">
              <Button
                onClick={handleSubmitOrder}
                className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                disabled={
                  !customerName ||
                  !pickupDate ||
                  !pickupTime ||
                  !paymentMethod ||
                  puffItems.length === 0 ||
                  isSubmitting ||
                  showCustomerSelection ||
                  showContactUpdatePrompt
                }
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Saving to Firebase...
                  </>
                ) : (
                  "Submit Order to Firebase"
                )}
              </Button>

              {/* Success/Error Messages */}
              {submitMessage && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    submitMessage.type === "success"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {submitMessage.type === "success" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{submitMessage.text}</span>
                </div>
              )}

              {(showCustomerSelection || showContactUpdatePrompt) && (
                <p className="text-purple-600 text-center text-sm">
                  ⚠️ Please complete the customer selection or contact update before submitting the order.
                </p>
              )}

              {(!customerName || !pickupDate || !pickupTime || !paymentMethod || puffItems.length === 0) &&
                !submitMessage &&
                !showCustomerSelection &&
                !showContactUpdatePrompt && (
                  <p className="text-red-500 text-center text-sm">
                    ⚠️ Please complete required fields: Customer Name, Pickup Date, Pickup Time, Payment Method, and add
                    at least one puff item
                  </p>
                )}

              <div className="bg-blue-50/90 p-3 rounded-lg border border-blue-200">
                <p className="text-blue-700 text-sm flex items-center gap-2">
                  🔥 <span className="font-medium">Firebase Integration Active</span> - Orders will be saved to your
                  Firestore database in real-time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Navigation Footer - Always at bottom */}
      <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-sm mt-4 sm:mt-6 sticky bottom-0">
        <div className="p-4 sm:p-6 flex justify-center w-full">
          <div className="flex flex-wrap gap-0 w-full justify-between">
            <Button
              variant="default"
              className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm bg-amber-600 hover:bg-amber-700 text-white rounded-none first:rounded-l-lg last:rounded-r-lg"
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
              className="flex-1 flex items-center justify-center gap-2 text-xs sm:text-sm border-amber-300 text-amber-700 hover:bg-amber-50 rounded-none first:rounded-l-lg last:rounded-r-lg"
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
