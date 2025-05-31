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
  Plus,
  Minus,
  Trash2,
  Save,
  ArrowLeft,
  AlertCircle,
  CheckCircle,
  CreditCard,
} from "lucide-react"
import { useRouter } from "next/navigation"
import { updateOrder, prepareOrderForFirestore } from "@/lib/firestore"
// Add these imports at the top
import { findCustomer, type Customer } from "@/lib/rewards"
import RewardsDisplay from "@/components/rewards-display"

interface PuffItem {
  id: string
  category: string
  type: string
  price: number
  quantity: number
  defaultPrice: number
}

export default function EditOrderPage() {
  const [customerName, setCustomerName] = useState("")
  const [phoneEmail, setPhoneEmail] = useState("")
  const [pickupDate, setPickupDate] = useState("")
  const [pickupTime, setPickupTime] = useState("")
  const [deliveryRequired, setDeliveryRequired] = useState("No - Pickup Only")
  const [deliveryFee, setDeliveryFee] = useState("5.00")
  const [deliveryAddress, setDeliveryAddress] = useState("")
  const [paymentMethod, setPaymentMethod] = useState("")
  const [discount, setDiscount] = useState("0%")
  const [puffItems, setPuffItems] = useState<PuffItem[]>([])
  const [originalReceiptId, setOriginalReceiptId] = useState("")
  const [firestoreOrderId, setFirestoreOrderId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)
  // Add these state variables after the existing state
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [useRewardsRedemption, setUseRewardsRedemption] = useState(false)
  // First, add these state variables after the existing state declarations
  const [originalCustomerId, setOriginalCustomerId] = useState<string | undefined>(undefined)
  const [originalPointsEarned, setOriginalPointsEarned] = useState<number | undefined>(undefined)
  const [originalPointsRedeemed, setOriginalPointsRedeemed] = useState<number | undefined>(undefined)
  const [originalRewardsDiscountAmount, setOriginalRewardsDiscountAmount] = useState<number | undefined>(undefined)
  const [originalCustomerRewardsBalance, setOriginalCustomerRewardsBalance] = useState<number | undefined>(undefined)
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("UNPAID")

  const router = useRouter()

  // Then, update the useEffect that loads the order data to also load the rewards-related fields
  useEffect(() => {
    // Load order data for editing
    const editOrderData = localStorage.getItem("editOrder")
    if (editOrderData) {
      const order = JSON.parse(editOrderData)
      setOriginalReceiptId(order.receiptId)
      setFirestoreOrderId(order.id || "") // Firestore document ID
      setCustomerName(order.customerName)
      setPhoneEmail(order.customerContact === "Not provided" ? "" : order.customerContact)
      setPickupDate(order.deliveryDate)
      setPickupTime(order.deliveryTime)
      setDeliveryRequired(order.isDelivery ? "Yes - Delivery Required" : "No - Pickup Only")
      setDeliveryFee(order.deliveryFee.toString())
      setDeliveryAddress(order.deliveryAddress === "Not provided" ? "" : order.deliveryAddress)
      setPaymentMethod(order.paymentMethod === "Not provided" ? "" : order.paymentMethod)
      setDiscount(order.discountPercent)
      setPaymentStatus(order.paymentStatus || (order.isPaid ? "PAID" : "UNPAID"))

      // Store original rewards-related fields
      setOriginalCustomerId(order.customerId)
      setOriginalPointsEarned(order.pointsEarned)
      setOriginalPointsRedeemed(order.pointsRedeemed)
      setOriginalRewardsDiscountAmount(order.rewardsDiscountAmount)
      setOriginalCustomerRewardsBalance(order.customerRewardsBalance)

      // Convert items back to puff items format
      const convertedItems = order.items.map((item: any, index: number) => ({
        id: `edit-${index}`,
        category: item.category,
        type: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        defaultPrice: item.unitPrice,
      }))
      setPuffItems(convertedItems)

      // Clear the edit data
      localStorage.removeItem("editOrder")
    } else {
      // No edit data, redirect to history
      router.push("/history")
    }
  }, [router])

  // Add customer search effect after the existing useEffect
  useEffect(() => {
    const searchCustomer = async () => {
      if (
        (!customerName.trim() && !phoneEmail.trim()) ||
        (customerName.trim().length < 2 && phoneEmail.trim().length < 2)
      ) {
        setCustomer(null)
        setUseRewardsRedemption(false)
        return
      }

      setIsLoadingCustomer(true)
      try {
        let foundCustomer = null

        // Check if both name and phone/email are provided
        if (customerName.trim() && phoneEmail.trim()) {
          const isEmail = phoneEmail.includes("@")
          const phone = isEmail ? "" : phoneEmail
          const email = isEmail ? phoneEmail : ""

          // Find customer by name and either phone or email
          foundCustomer = await findCustomer(customerName, phone, email)
        } else if (customerName.trim()) {
          // If only name is provided, search by name
          foundCustomer = await findCustomer(customerName, "", "")
        } else if (phoneEmail.trim()) {
          // If only phone/email is provided, search by phone/email
          const isEmail = phoneEmail.includes("@")
          const phone = isEmail ? "" : phoneEmail
          const email = isEmail ? phoneEmail : ""
          foundCustomer = await findCustomer("", phone, email)
        }

        if (foundCustomer) {
          // Customer found
          setCustomer(foundCustomer)
        } else {
          // Customer not found
          setCustomer(null)
        }
        setUseRewardsRedemption(false)
      } catch (error) {
        console.error("Error searching for customer:", error)
        setCustomer(null)
      } finally {
        setIsLoadingCustomer(false)
      }
    }

    const timeoutId = setTimeout(searchCustomer, 500)
    return () => clearTimeout(timeoutId)
  }, [customerName, phoneEmail])

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
  const taxRate = 0.0825
  const taxAmount = subtotalAfterDiscount * taxRate
  const finalTotal = subtotalAfterDiscount + deliveryFeeAmount + taxAmount

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

  // Now update the handleSaveOrder function to include the rewards-related fields
  const handleSaveOrder = async () => {
    if (!customerName || !pickupDate || !pickupTime || puffItems.length === 0) {
      return
    }

    if (!firestoreOrderId) {
      setUpdateMessage({ type: "error", text: "❌ Cannot update order: missing Firestore ID" })
      return
    }

    setIsUpdating(true)
    setUpdateMessage(null)

    try {
      // Check if payment is cash for tax calculation
      const isCashPayment = paymentMethod === "cash"
      const calculatedTaxRate = isCashPayment ? 0 : taxRate
      const calculatedTaxAmount = isCashPayment ? 0 : subtotalAfterDiscount * taxRate
      const calculatedFinalTotal = subtotalAfterDiscount + deliveryFeeAmount + calculatedTaxAmount

      // Calculate points earned (1 point per $1 spent, rounded down)
      const pointsEarned = Math.floor(subtotalAfterDiscount)

      // Calculate rewards discount if applicable
      let rewardsDiscountAmount = 0
      let pointsRedeemed = 0

      if (useRewardsRedemption && customer && customer.rewardsBalance >= 100) {
        rewardsDiscountAmount = subtotalAfterDiscount * 0.1 // 10% discount
        pointsRedeemed = 100 // 100 points for 10% discount
      }

      const finalSubtotalAfterRewards = subtotalAfterDiscount - rewardsDiscountAmount

      // Prepare updated order data
      const updatedOrderData = {
        receiptId: originalReceiptId,
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
        paymentStatus, // Include payment status

        // Include rewards-related fields, using original values if not modified
        customerId: customer ? customer.id : originalCustomerId || null,
        pointsEarned: pointsEarned,
        pointsRedeemed: useRewardsRedemption ? pointsRedeemed : originalPointsRedeemed || 0,
        rewardsDiscountAmount: useRewardsRedemption ? rewardsDiscountAmount : originalRewardsDiscountAmount || 0,
        customerRewardsBalance: customer
          ? customer.rewardsBalance - pointsRedeemed + pointsEarned
          : originalCustomerRewardsBalance || 0,
      }

      // Update in Firestore
      const firestoreOrderData = prepareOrderForFirestore(updatedOrderData)
      await updateOrder(firestoreOrderId, firestoreOrderData)

      // Store updated order for receipt view
      const orderWithId = { ...updatedOrderData, id: firestoreOrderId }
      localStorage.setItem("currentOrder", JSON.stringify(orderWithId))

      setUpdateMessage({ type: "success", text: "✅ Order successfully updated in Firebase!" })

      // Navigate to receipt page after a brief delay
      setTimeout(() => {
        router.push("/receipt")
      }, 1500)
    } catch (error) {
      console.error("Error updating order:", error)
      setUpdateMessage({
        type: "error",
        text: `❌ Failed to update order: ${error instanceof Error ? error.message : "Unknown error"}`,
      })
    } finally {
      setIsUpdating(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm mb-6">
          <div className="p-6 border-b">
            <div className="flex items-center gap-4 mb-4">
              <Button variant="outline" onClick={() => router.push("/history")}>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to History
              </Button>
              <h1 className="text-2xl font-bold text-amber-800">Edit Order #{originalReceiptId}</h1>
              {firestoreOrderId && (
                <span className="text-sm text-gray-500">Firebase ID: {firestoreOrderId.substring(0, 8)}...</span>
              )}
            </div>
          </div>
        </div>

        {/* Edit Order Form */}
        <Card className="bg-amber-50 border-amber-200">
          <CardHeader className="bg-amber-100 border-b border-amber-200">
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <Package className="w-5 h-5" />
              Edit Order
            </CardTitle>
          </CardHeader>

          <CardContent className="p-6 space-y-6">
            {/* Customer Details */}
            <div>
              <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-800 mb-4">
                <span>👤</span> Customer Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="customerName" className="text-amber-800">
                    Customer Name *
                  </Label>
                  <Input
                    id="customerName"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Enter customer name"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="phoneEmail" className="text-amber-800">
                    Phone or Email
                  </Label>
                  <Input
                    id="phoneEmail"
                    value={phoneEmail}
                    onChange={(e) => setPhoneEmail(e.target.value)}
                    placeholder="Enter phone or email (optional)"
                    className="mt-1"
                  />
                </div>
              </div>
              {customer && !isLoadingCustomer && (
                <div className="mt-4 p-3 rounded-md bg-green-50 border border-green-200 text-green-800">
                  Customer Found! - {customer.name} - Rewards Balance: {customer.rewardsBalance}
                </div>
              )}

              {!customer && customerName.trim() !== "" && phoneEmail.trim() !== "" && !isLoadingCustomer && (
                <div className="mt-4 p-3 rounded-md bg-blue-50 border border-blue-200 text-blue-800">
                  New Customer - A new customer account will be created.
                </div>
              )}
            </div>
            {/* Rewards Display for Edit Page */}
            {customer && !isLoadingCustomer && (
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
              <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-800 mb-4">
                <Calendar className="w-5 h-5" />
                Pickup Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="pickupDate" className="text-amber-800">
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
                  <Label htmlFor="pickupTime" className="text-amber-800">
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
              <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-800 mb-4">
                <Package className="w-5 h-5" />
                Delivery Options
              </h3>
              <div className="space-y-4">
                <div>
                  <Label className="text-amber-800">Delivery Required?</Label>
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
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-amber-100 rounded-lg">
                    <div>
                      <Label className="text-amber-800">Delivery Fee</Label>
                      <Input value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} className="mt-1" />
                    </div>
                    <div>
                      <Label className="text-amber-800">Delivery Address</Label>
                      <Input
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="mt-1"
                        placeholder="Enter delivery address"
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
                className="flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4" />
                Add Puffs to Order
              </Button>
            </div>

            {/* Puff Items */}
            {puffItems.map((item) => (
              <div
                key={item.id}
                className="grid grid-cols-12 gap-4 items-end p-4 bg-white rounded-lg border border-amber-200"
              >
                <div className="col-span-2">
                  <Label className="text-amber-800">Category</Label>
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
                    <SelectTrigger>
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

                <div className="col-span-3">
                  <Label className="text-amber-800">Puff Type</Label>
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
                    <SelectTrigger>
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

                <div className="col-span-2">
                  <Label className="text-amber-800">Price</Label>
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
                  />
                </div>

                <div className="col-span-3">
                  <Label className="text-amber-800">Quantity</Label>
                  <div className="flex items-center gap-2">
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

                <div className="col-span-2 flex justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removePuffItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Remove
                  </Button>
                </div>
              </div>
            ))}

            {puffItems.length > 0 && (
              <Button
                onClick={addPuffItem}
                variant="outline"
                className="flex items-center gap-2 text-amber-700 border-amber-300 hover:bg-amber-50"
              >
                <Plus className="w-4 h-4" />
                Add Another Puff
              </Button>
            )}

            {/* Enhanced Final Order Summary */}
            {puffItems.length > 0 && (
              <div className="bg-white p-6 rounded-lg border border-amber-200">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-amber-800 mb-6">
                  📋 Updated Order Summary
                </h3>

                {/* Individual Items */}
                <div className="space-y-2 mb-4">
                  {puffItems.map((item) => (
                    <div key={item.id} className="flex justify-between text-sm">
                      <span>
                        {item.quantity}x {item.type} ({item.category})
                      </span>
                      <span>${(item.price * item.quantity).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <Separator className="my-4" />

                {/* Summary Calculations */}
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="font-medium">Puff Subtotal:</span>
                    <span className="font-medium">${puffSubtotal.toFixed(2)}</span>
                  </div>

                  {deliveryRequired.includes("Delivery") && (
                    <div className="flex justify-between">
                      <span>Delivery Fee:</span>
                      <span>${deliveryFeeAmount.toFixed(2)}</span>
                    </div>
                  )}

                  {discountAmount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount ({discount}):</span>
                      <span>-${(puffSubtotal * discountAmount).toFixed(2)}</span>
                    </div>
                  )}

                  {useRewardsRedemption && customer && customer.rewardsBalance >= 100 && (
                    <div className="flex justify-between text-blue-600">
                      <span>Rewards Redemption (10%):</span>
                      <span>-${(subtotalAfterDiscount * 0.1).toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between font-semibold text-amber-800 bg-amber-50 p-2 rounded">
                    <span>Pre-Tax Subtotal:</span>
                    <span>${subtotalAfterDiscount.toFixed(2)}</span>
                  </div>

                  <div className="flex justify-between">
                    <span>Tax {paymentMethod === "cash" ? "(0% for Cash)" : `(${(taxRate * 100).toFixed(2)}%)`}:</span>
                    <span>${paymentMethod === "cash" ? "0.00" : taxAmount.toFixed(2)}</span>
                  </div>

                  <Separator className="my-3" />

                  <div className="flex justify-between text-xl font-bold text-amber-800 bg-amber-100 p-3 rounded-lg">
                    <span>Final Total:</span>
                    <span>
                      ${(paymentMethod === "cash" ? subtotalAfterDiscount + deliveryFeeAmount : finalTotal).toFixed(2)}
                    </span>
                  </div>

                  {/* Delivery Details */}
                  {deliveryRequired.includes("Delivery") && (
                    <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="flex items-center gap-2 font-medium text-blue-800 mb-2">🚚 Delivery Details:</h4>
                      <div className="text-sm text-blue-700">
                        <div>
                          <strong>Address:</strong> {deliveryAddress || "Not provided"}
                        </div>
                        <div>
                          <strong>Fee:</strong> ${deliveryFeeAmount.toFixed(2)}
                        </div>
                      </div>
                    </div>
                  )}
                  {customer && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                      <h4 className="flex items-center gap-2 font-medium text-green-800 mb-2">
                        <CheckCircle className="w-4 h-4" /> Rewards Details:
                      </h4>
                      <div className="text-sm text-green-700">
                        <div>
                          <strong>Points Earned:</strong> {Math.floor(subtotalAfterDiscount)}
                        </div>
                        {useRewardsRedemption && customer.rewardsBalance >= 100 && (
                          <div>
                            <strong>Points Redeemed:</strong> 100
                          </div>
                        )}
                        <div>
                          <strong>New Balance:</strong>{" "}
                          {customer.rewardsBalance -
                            (useRewardsRedemption ? 100 : 0) +
                            Math.floor(subtotalAfterDiscount)}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Payment and Discount */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
              </div>

              <div>
                <Label className="text-amber-800 text-sm flex items-center gap-2">
                  Payment Status *
                  <CreditCard className="w-3 h-3" />
                </Label>
                <Select value={paymentStatus} onValueChange={(value: "PAID" | "UNPAID") => setPaymentStatus(value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="UNPAID">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                        UNPAID
                      </div>
                    </SelectItem>
                    <SelectItem value="PAID">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                        PAID
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
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

            {/* Save Button */}
            <div className="space-y-4">
              <Button
                onClick={handleSaveOrder}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold"
                disabled={!customerName || !pickupDate || !pickupTime || puffItems.length === 0 || isUpdating}
                size="lg"
              >
                {isUpdating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Updating in Firebase...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Changes to Firebase
                  </>
                )}
              </Button>

              {/* Success/Error Messages */}
              {updateMessage && (
                <div
                  className={`p-3 rounded-lg border flex items-center gap-2 ${
                    updateMessage.type === "success"
                      ? "bg-green-50 border-green-200 text-green-800"
                      : "bg-red-50 border-red-200 text-red-800"
                  }`}
                >
                  {updateMessage.type === "success" ? (
                    <CheckCircle className="w-4 h-4" />
                  ) : (
                    <AlertCircle className="w-4 h-4" />
                  )}
                  <span className="text-sm">{updateMessage.text}</span>
                </div>
              )}

              {(!customerName || !pickupDate || !pickupTime || puffItems.length === 0) && !updateMessage && (
                <p className="text-red-500 text-center">
                  ⚠️ Please complete required fields: Customer Name, Pickup Date, Pickup Time, and add at least one puff
                  item
                </p>
              )}

              <div className="bg-blue-50/90 p-3 rounded-lg border border-blue-200">
                <p className="text-blue-700 text-sm flex items-center gap-2">
                  🔥 <span className="font-medium">Firebase Integration Active</span> - Changes will be saved to your
                  Firestore database in real-time
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
