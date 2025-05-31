"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Package, Plus, Minus, Trash2, AlertCircle, CheckCircle, ArrowLeft, CreditCard } from "lucide-react"
import { updateOrder } from "@/lib/firestore"
import { findCustomer, processOrderRewards, type Customer } from "@/lib/rewards"
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
  const [paymentStatus, setPaymentStatus] = useState<"PAID" | "UNPAID">("UNPAID")
  const [discount, setDiscount] = useState("0%")
  const [puffItems, setPuffItems] = useState<PuffItem[]>([])
  const [originalReceiptId, setOriginalReceiptId] = useState("")
  const [firestoreOrderId, setFirestoreOrderId] = useState("")
  const [isUpdating, setIsUpdating] = useState(false)
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null)

  // Customer and rewards state
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [isLoadingCustomer, setIsLoadingCustomer] = useState(false)
  const [useRewardsRedemption, setUseRewardsRedemption] = useState(false)

  // Original rewards data for comparison
  const [originalCustomerId, setOriginalCustomerId] = useState<string | undefined>(undefined)
  const [originalPointsEarned, setOriginalPointsEarned] = useState<number | undefined>(undefined)
  const [originalPointsRedeemed, setOriginalPointsRedeemed] = useState<number | undefined>(undefined)
  const [originalRewardsDiscountAmount, setOriginalRewardsDiscountAmount] = useState<number | undefined>(undefined)
  const [originalCustomerRewardsBalance, setOriginalCustomerRewardsBalance] = useState<number | undefined>(undefined)

  const router = useRouter()

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
      setDeliveryFee(order.deliveryFee?.toString() || "5.00")
      setDeliveryAddress(order.deliveryAddress || "")
      setPaymentMethod(order.paymentMethod)
      setPaymentStatus(order.paymentStatus || (order.isPaid ? "PAID" : "UNPAID"))
      setDiscount(order.discountPercent || "0%")

      // Load puff items
      const items = order.items.map((item: any, index: number) => ({
        id: `item-${index}`,
        category: item.category,
        type: item.name,
        price: item.unitPrice,
        quantity: item.quantity,
        defaultPrice: item.unitPrice,
      }))
      setPuffItems(items)

      // Store original rewards data
      setOriginalCustomerId(order.customerId)
      setOriginalPointsEarned(order.pointsEarned)
      setOriginalPointsRedeemed(order.pointsRedeemed)
      setOriginalRewardsDiscountAmount(order.rewardsDiscountAmount)
      setOriginalCustomerRewardsBalance(order.customerRewardsBalance)

      // Set rewards redemption if it was used
      setUseRewardsRedemption((order.pointsRedeemed || 0) > 0)

      // Load customer data if available
      if (order.customerId) {
        loadCustomerData(order.customerName, order.customerContact)
      }
    } else {
      // No order data found, redirect back
      router.push("/history")
    }
  }, [router])

  const loadCustomerData = async (name: string, contact: string) => {
    setIsLoadingCustomer(true)
    try {
      const isEmail = contact.includes("@")
      const phone = isEmail ? "" : contact
      const email = isEmail ? contact : ""

      const foundCustomer = await findCustomer(name, phone, email)
      if (foundCustomer) {
        setCustomer(foundCustomer)
      }
    } catch (error) {
      console.error("Error loading customer data:", error)
    } finally {
      setIsLoadingCustomer(false)
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

  // Calculations
  const puffSubtotal = puffItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const deliveryFeeAmount = deliveryRequired.includes("Delivery") ? Number.parseFloat(deliveryFee) : 0
  const discountAmount = Number.parseFloat(discount.replace("%", "")) / 100
  const subtotalAfterDiscount = puffSubtotal * (1 - discountAmount)

  // Calculate rewards discount
  const rewardsDiscountAmount = useRewardsRedemption && customer ? subtotalAfterDiscount * 0.1 : 0
  const finalSubtotalAfterRewards = subtotalAfterDiscount - rewardsDiscountAmount

  const isCashPayment = paymentMethod === "cash"
  const taxRate = isCashPayment ? 0 : 0.0825
  const taxAmount = isCashPayment ? 0 : finalSubtotalAfterRewards * taxRate
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

  const handleUpdateOrder = async () => {
    if (!customerName || !pickupDate || !pickupTime || !paymentMethod || puffItems.length === 0 || !firestoreOrderId) {
      return
    }

    setIsUpdating(true)
    setUpdateMessage(null)

    try {
      // Process rewards if customer exists
      let rewardsResult = {
        pointsEarned: 0,
        pointsRedeemed: 0,
        discountAmount: 0,
        newPointsBalance: customer?.rewardsPoints || 0,
      }

      if (customer) {
        rewardsResult = await processOrderRewards(
          customer,
          subtotalAfterDiscount,
          originalReceiptId,
          useRewardsRedemption,
        )
      }

      const updatedOrderData = {
        customerName,
        customerContact: phoneEmail || "Not provided",
        deliveryDate: pickupDate,
        deliveryTime: pickupTime,
        paymentMethod: paymentMethod || "Not provided",
        paymentStatus,
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
        tax: taxAmount,
        taxRate: taxRate,
        finalTotal: finalTotal,
        isPaid: paymentStatus === "PAID",
        // Rewards data
        customerId: customer?.id,
        pointsEarned: rewardsResult.pointsEarned,
        pointsRedeemed: rewardsResult.pointsRedeemed,
        rewardsDiscountAmount: rewardsResult.discountAmount,
        customerRewardsBalance: rewardsResult.newPointsBalance,
      }

      // Update in Firestore
      await updateOrder(firestoreOrderId, updatedOrderData)

      // Store updated order for receipt view
      const orderWithId = {
        ...updatedOrderData,
        receiptId: originalReceiptId,
        id: firestoreOrderId,
        createdAt: new Date().toISOString(),
      }
      localStorage.setItem("currentOrder", JSON.stringify(orderWithId))

      setUpdateMessage({ type: "success", text: "✅ Order successfully updated in Firebase!" })

      // Navigate to receipt after a brief delay
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
    <div className="min-h-screen flex flex-col relative">
      {/* Background with 90% transparency */}
      <div
        className="absolute inset-0 z-0"
        style={{
          backgroundImage: "url('/images/pastry-background.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
          backgroundAttachment: "fixed",
          opacity: 0.1,
        }}
      />

      {/* Content with proper z-index */}
      <div className="relative z-10 flex-1 overflow-auto">
        <div className="p-2 sm:p-4">
          <div className="max-w-4xl mx-auto w-full">
            {/* Header */}
            <div className="mb-4">
              <Button
                onClick={() => router.push("/history")}
                variant="outline"
                className="mb-4 flex items-center gap-2 border-amber-300 text-amber-700 hover:bg-amber-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to History
              </Button>
            </div>

            {/* Edit Order Form */}
            <Card className="bg-amber-50/95 backdrop-blur-sm border-amber-200">
              <CardHeader className="bg-amber-100/95 border-b border-amber-200">
                <CardTitle className="flex items-center gap-2 text-amber-800">
                  <Package className="w-5 h-5" />
                  Edit Order #{originalReceiptId}
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
                      <Label htmlFor="customerName" className="text-amber-800 text-sm">
                        Customer Name *
                      </Label>
                      <Input
                        id="customerName"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter full name"
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
                    </div>
                  </div>
                </div>

                {/* Rewards Display */}
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
                  <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-800 mb-4">
                    <Package className="w-5 h-5" />
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
                    <Package className="w-5 h-5" />
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
                          <Input
                            value={deliveryFee}
                            onChange={(e) => setDeliveryFee(e.target.value)}
                            className="mt-1"
                          />
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

                {/* Order Summary */}
                {puffItems.length > 0 && (
                  <div className="bg-white/90 p-4 sm:p-6 rounded-lg border border-amber-200">
                    <h3 className="flex items-center gap-2 text-base sm:text-lg font-semibold text-amber-800 mb-4 sm:mb-6">
                      📋 Order Summary
                    </h3>

                    <div className="space-y-3">
                      <div className="flex justify-between text-base">
                        <span>Puff Subtotal:</span>
                        <span>${puffSubtotal.toFixed(2)}</span>
                      </div>

                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({discount}):</span>
                          <span>-${(puffSubtotal * discountAmount).toFixed(2)}</span>
                        </div>
                      )}

                      {useRewardsRedemption && rewardsDiscountAmount > 0 && (
                        <div className="flex justify-between text-purple-600">
                          <span>Rewards Redemption (10%):</span>
                          <span>-${rewardsDiscountAmount.toFixed(2)}</span>
                        </div>
                      )}

                      {deliveryRequired.includes("Delivery") && (
                        <div className="flex justify-between text-blue-600">
                          <span>Delivery Fee:</span>
                          <span>+${deliveryFeeAmount.toFixed(2)}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span>Tax {paymentMethod === "cash" ? "(0% for Cash)" : "(8.25%)"}:</span>
                        <span>+${taxAmount.toFixed(2)}</span>
                      </div>

                      <Separator className="my-3" />

                      <div className="flex justify-between text-lg font-bold text-amber-800 bg-amber-100 p-3 rounded-lg">
                        <span>Final Total:</span>
                        <span>${finalTotal.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Payment Method, Payment Status, and Discount */}
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

                {/* Update Button */}
                <div className="space-y-4">
                  <Button
                    onClick={handleUpdateOrder}
                    className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold"
                    disabled={
                      !customerName ||
                      !pickupDate ||
                      !pickupTime ||
                      !paymentMethod ||
                      puffItems.length === 0 ||
                      isUpdating ||
                      !firestoreOrderId
                    }
                    size="lg"
                  >
                    {isUpdating ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Updating Order...
                      </>
                    ) : (
                      "Update Order"
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

                  {(!customerName || !pickupDate || !pickupTime || !paymentMethod || puffItems.length === 0) &&
                    !updateMessage && (
                      <p className="text-red-500 text-center text-sm">
                        ⚠️ Please complete required fields: Customer Name, Pickup Date, Pickup Time, Payment Method, and
                        add at least one puff item
                      </p>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
