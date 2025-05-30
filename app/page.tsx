"use client"

import { useState } from "react"
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
} from "lucide-react"
import { useRouter } from "next/navigation"
import { addOrder, prepareOrderForFirestore } from "@/lib/firestore"
// Import the Firebase banner
import FirebaseBanner from "@/components/firebase-banner"

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

  const router = useRouter()

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

  const handleSubmitOrder = async () => {
    if (!customerName || !pickupDate || !pickupTime || !paymentMethod || puffItems.length === 0) {
      return
    }

    setIsSubmitting(true)
    setSubmitMessage(null)

    try {
      const receiptId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)

      // Calculate tax - set to 0 for cash payments
      const isCashPayment = paymentMethod === "cash"
      const calculatedTaxRate = isCashPayment ? 0 : taxRate
      const calculatedTaxAmount = isCashPayment ? 0 : subtotalAfterDiscount * taxRate
      const calculatedFinalTotal = subtotalAfterDiscount + deliveryFeeAmount + calculatedTaxAmount

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
      }

      // Save to Firestore
      const firestoreOrderData = prepareOrderForFirestore(orderData)
      const firestoreOrderId = await addOrder(firestoreOrderData)

      // Store for receipt view (with Firestore ID)
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
      {/* Find the div that contains the main content (after the background style div)
      Add the FirebaseBanner component at the top of the content */}
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
                  <Label htmlFor="customerName" className="text-amber-800 text-sm">
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
                  <Label htmlFor="phoneEmail" className="text-amber-800 text-sm">
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
            </div>

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

                  {deliveryRequired.includes("Delivery") && (
                    <div className="flex justify-between text-blue-600">
                      <span>{discountAmount > 0 ? "4." : "3."} Delivery Fee:</span>
                      <span>+${deliveryFeeAmount.toFixed(2)}</span>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <span>
                      {deliveryRequired.includes("Delivery")
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
                      ${(paymentMethod === "cash" ? subtotalAfterDiscount + deliveryFeeAmount : finalTotal).toFixed(2)}
                    </span>
                  </div>

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
                    <SelectItem value="10%">10%</SelectItem>
                    <SelectItem value="15%">15%</SelectItem>
                    <SelectItem value="20%">20%</SelectItem>
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
                  isSubmitting
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

              {(!customerName || !pickupDate || !pickupTime || !paymentMethod || puffItems.length === 0) &&
                !submitMessage && (
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
        {/* Firebase Status Component - Remove after testing */}
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
