"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Printer, Gift, Star, CheckCircle, XCircle, CreditCard, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

interface ReceiptItem {
  name: string
  category: string
  quantity: number
  unitPrice: number
  total: number
}

interface ReceiptProps {
  receiptId: string
  customerName: string
  customerContact: string
  deliveryDate: string
  deliveryTime: string
  paymentMethod: string
  paymentStatus?: "PAID" | "UNPAID" // New payment status prop
  isDelivery: boolean
  deliveryAddress?: string
  deliveryFee: number
  items: ReceiptItem[]
  puffSubtotal: number
  discount: number
  discountPercent: string
  preTaxSubtotal: number
  tax: number
  taxRate: number
  finalTotal: number
  isPaid: boolean
  // Rewards fields
  pointsEarned?: number
  pointsRedeemed?: number
  rewardsDiscountAmount?: number
  customerRewardsBalance?: number
  customerPreviousBalance?: number
}

export default function Receipt({
  receiptId,
  customerName,
  customerContact,
  deliveryDate,
  deliveryTime,
  paymentMethod,
  paymentStatus,
  isDelivery,
  deliveryAddress,
  deliveryFee,
  items,
  puffSubtotal,
  discount,
  discountPercent,
  preTaxSubtotal,
  tax,
  taxRate,
  finalTotal,
  isPaid,
  // Rewards fields
  pointsEarned = 0,
  pointsRedeemed = 0,
  rewardsDiscountAmount = 0,
  customerRewardsBalance = 0,
  customerPreviousBalance = 0,
}: ReceiptProps) {
  const router = useRouter()

  const handlePrintPDF = () => {
    window.print()
  }

  // Calculate previous balance (before this transaction)
  const previousBalance = customerRewardsBalance - pointsEarned + pointsRedeemed

  // Determine payment status (with backward compatibility)
  const currentPaymentStatus = paymentStatus || (isPaid ? "PAID" : "UNPAID")
  const isPaymentPaid = currentPaymentStatus === "PAID"

  return (
    <div className="min-h-screen bg-gray-50 p-2 sm:p-4">
      <div className="max-w-md mx-auto">
        {/* Print and Navigation Buttons - Hidden when printing */}
        <div className="print:hidden mb-4 flex flex-col sm:flex-row gap-2 justify-end">
          <Button
            onClick={() => router.push("/history")}
            variant="outline"
            className="bg-amber-600 hover:bg-amber-700 text-white border-amber-600 hover:border-amber-700 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Orders
          </Button>
          <Button onClick={handlePrintPDF} className="bg-orange-600 hover:bg-orange-700 text-white text-sm">
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        </div>

        {/* Compact Receipt */}
        <Card className="bg-amber-50 border-amber-200 print:shadow-none print:border-none">
          <CardContent className="p-4">
            {/* Receipt Header - Compact */}
            <div className="text-center mb-4">
              <h2 className="text-lg font-bold text-amber-800 mb-1">Receipt #{receiptId}</h2>

              {/* Payment Status Display - Prominent */}
              <div
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-semibold text-sm ${
                  isPaymentPaid
                    ? "bg-green-100 text-green-800 border border-green-300"
                    : "bg-red-100 text-red-800 border border-red-300"
                }`}
              >
                {isPaymentPaid ? (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    <span>🟢 PAYMENT RECEIVED</span>
                  </>
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    <span>🔴 PAYMENT PENDING</span>
                  </>
                )}
              </div>
            </div>

            {/* Company Info and QR Code - Compact */}
            <div className="bg-white p-3 rounded-lg border border-amber-200 mb-4 print:border-gray-300">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <img src="/images/pd-logo.png" alt="P&D Logo" className="w-8 h-8 object-contain" />
                  <div>
                    <h3 className="font-bold text-amber-800 text-sm">P&D Pastry Delights</h3>
                    <p className="text-xs text-amber-600">Premium Puff Pastries</p>
                  </div>
                </div>
                <div>
                  <img src="/images/qr-code.png" alt="QR Code" className="w-12 h-12 object-contain" />
                </div>
              </div>
              <div className="mt-2 text-xs sm:text-sm text-amber-600">
                <div>Receipt ID: {receiptId}</div>
                <div>
                  Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Customer and Delivery Info - Side by Side */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4">
              {/* Customer Information */}
              <div className="bg-white p-3 rounded-lg border border-amber-200 print:border-gray-300">
                <h4 className="font-semibold text-amber-800 mb-2 text-sm">Customer Information</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {customerName}
                  </div>
                  <div>
                    <span className="font-medium">Contact:</span> {customerContact}
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-white p-3 rounded-lg border border-amber-200 print:border-gray-300">
                <h4 className="font-semibold text-amber-800 mb-2 text-sm">Delivery Details</h4>
                <div className="space-y-1 text-xs sm:text-sm">
                  <div>
                    <span className="font-medium">Date:</span> {deliveryDate}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {deliveryTime}
                  </div>
                  <div>
                    <span className="font-medium">Payment:</span> {paymentMethod}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="font-medium">🚚 Delivery:</span>
                    <span className={isDelivery ? "text-blue-600" : "text-gray-600"}>{isDelivery ? "Yes" : "No"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Status Section - Enhanced */}
            <div
              className={`p-3 rounded-lg border mb-4 ${
                isPaymentPaid
                  ? "bg-green-50 border-green-200 print:bg-gray-100 print:border-gray-300"
                  : "bg-red-50 border-red-200 print:bg-gray-100 print:border-gray-300"
              }`}
            >
              <h4
                className={`flex items-center gap-2 font-semibold mb-2 text-sm ${
                  isPaymentPaid ? "text-green-800" : "text-red-800"
                }`}
              >
                <CreditCard className="w-4 h-4" />
                Payment Status
              </h4>
              <div className={`text-sm ${isPaymentPaid ? "text-green-700" : "text-red-700"}`}>
                <div className="flex justify-between items-center">
                  <span>Status:</span>
                  <span className="font-semibold flex items-center gap-1">
                    {isPaymentPaid ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        PAID
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        UNPAID
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Method:</span>
                  <span className="font-medium">{paymentMethod}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span>Amount:</span>
                  <span className="font-bold">${finalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Items Ordered - Compact */}
            <div className="bg-white p-3 rounded-lg border border-amber-200 mb-4 print:border-gray-300">
              <h4 className="font-semibold text-amber-800 mb-3 text-sm">Items Ordered</h4>
              <div className="space-y-2">
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-xs sm:text-sm">
                    <div className="flex-1">
                      <div className="font-medium text-amber-800">{item.name}</div>
                      <div className="text-amber-600">{item.category}</div>
                      <div className="text-gray-600">Qty: {item.quantity}</div>
                    </div>
                    <div className="text-right ml-2">
                      <div className="font-semibold">${item.total.toFixed(2)}</div>
                      <div className="text-gray-600">@ ${item.unitPrice.toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Calculation Breakdown - Compact */}
            <div className="bg-white p-3 rounded-lg border border-amber-200 mb-4 print:border-gray-300">
              <h4 className="flex items-center gap-2 font-semibold text-amber-800 mb-3 text-sm">
                📋 Order Calculation Breakdown
              </h4>

              {/* Items breakdown - Compact */}
              <div className="space-y-1 mb-3">
                <h5 className="font-medium text-amber-700 text-xs sm:text-sm">Items Ordered:</h5>
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-xs sm:text-sm bg-gray-50 p-1 rounded">
                    <span className="truncate">
                      {item.quantity}x {item.name} ({item.category}) @ ${item.unitPrice.toFixed(2)}
                    </span>
                    <span className="font-medium ml-2">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-2" />

              {/* Step-by-step calculations - Compact */}
              <div className="space-y-1 text-xs sm:text-sm">
                <div className="flex justify-between">
                  <span>1. Puff Subtotal:</span>
                  <span>${puffSubtotal.toFixed(2)}</span>
                </div>

                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>2. Discount ({discountPercent}):</span>
                    <span>-${discount.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between font-semibold bg-amber-50 p-1 rounded print:bg-gray-100">
                  <span>{discount > 0 ? "3." : "2."} Subtotal After Discount:</span>
                  <span>${preTaxSubtotal.toFixed(2)}</span>
                </div>

                {rewardsDiscountAmount > 0 && (
                  <div className="flex justify-between text-purple-600">
                    <span>{discount > 0 ? "4." : "3."} Rewards Redemption (10%):</span>
                    <span>-${rewardsDiscountAmount.toFixed(2)}</span>
                  </div>
                )}

                {isDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>
                      {rewardsDiscountAmount > 0 ? (discount > 0 ? "5." : "4.") : discount > 0 ? "4." : "3."} Delivery
                      Fee:
                    </span>
                    <span>+${deliveryFee.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>
                    {isDelivery
                      ? rewardsDiscountAmount > 0
                        ? discount > 0
                          ? "6."
                          : "5."
                        : discount > 0
                          ? "5."
                          : "4."
                      : rewardsDiscountAmount > 0
                        ? discount > 0
                          ? "5."
                          : "4."
                        : discount > 0
                          ? "4."
                          : "3."}{" "}
                    Tax {paymentMethod === "cash" ? "(0% for Cash)" : `(${(taxRate * 100).toFixed(2)}%)`}:
                  </span>
                  <span>+${tax.toFixed(2)}</span>
                </div>

                <Separator className="my-1" />

                <div className="flex justify-between text-base font-bold text-amber-800 bg-amber-100 p-2 rounded print:bg-gray-100">
                  <span>Final Total:</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>

                {/* Payment Status in Summary */}
                <div
                  className={`text-center mt-2 p-2 rounded ${
                    isPaymentPaid ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                  }`}
                >
                  <span
                    className={`font-semibold text-xs sm:text-sm flex items-center justify-center gap-1 ${
                      isPaymentPaid ? "text-green-800" : "text-red-800"
                    }`}
                  >
                    {isPaymentPaid ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        PAYMENT RECEIVED
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3" />
                        PAYMENT PENDING
                      </>
                    )}
                  </span>
                </div>
              </div>

              {/* Delivery details if applicable - Compact */}
              {isDelivery && deliveryAddress && (
                <div className="mt-3 p-2 bg-blue-50 rounded-lg border border-blue-200 print:bg-gray-100 print:border-gray-300">
                  <h5 className="flex items-center gap-1 font-medium text-blue-800 mb-1 text-xs sm:text-sm">
                    🚚 Delivery Info:
                  </h5>
                  <div className="text-xs sm:text-sm text-blue-700">
                    <div>
                      <strong>Address:</strong> {deliveryAddress}
                    </div>
                    <div>
                      <strong>Fee:</strong> ${deliveryFee.toFixed(2)}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Rewards Summary - Updated with clear calculation */}
            {(pointsEarned > 0 || pointsRedeemed > 0 || customerRewardsBalance > 0) && (
              <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-3 rounded-lg border border-purple-200 mb-4 print:bg-gray-100 print:border-gray-300">
                <h4 className="flex items-center gap-2 font-semibold text-purple-800 mb-3 text-sm">
                  <Gift className="w-4 h-4" />🎁 Rewards Summary
                </h4>

                <div className="space-y-2 text-xs sm:text-sm">
                  <div className="flex justify-between items-center">
                    <span className="text-purple-700">Starting Balance:</span>
                    <span className="font-medium">{previousBalance} points</span>
                  </div>

                  {pointsRedeemed > 0 && (
                    <div className="flex justify-between items-center text-red-600">
                      <span>Points redeemed:</span>
                      <span className="font-semibold">-{pointsRedeemed} points</span>
                    </div>
                  )}

                  {pointsEarned > 0 && (
                    <div className="flex justify-between items-center text-green-600">
                      <span>Points earned this order:</span>
                      <span className="font-semibold">+{pointsEarned} points</span>
                    </div>
                  )}

                  <Separator className="my-2" />

                  <div className="flex justify-between items-center bg-white/60 p-2 rounded">
                    <span className="font-medium text-purple-800 flex items-center gap-1">
                      <Star className="w-3 h-3" />
                      New rewards balance:
                    </span>
                    <span className="font-bold text-purple-800">{customerRewardsBalance} points</span>
                  </div>

                  <div className="text-center text-purple-600 text-xs sm:text-sm mt-1">
                    {previousBalance} {pointsRedeemed > 0 ? `- ${pointsRedeemed}` : ""} + {pointsEarned} ={" "}
                    {customerRewardsBalance} points
                  </div>

                  <div className="text-center text-purple-600 text-xs sm:text-sm mt-2">
                    💡 Earn 1 point per $1 spent • Redeem 100 points for 10% off
                  </div>

                  {customerRewardsBalance >= 100 && (
                    <div className="text-center bg-green-100 text-green-800 p-2 rounded text-xs sm:text-sm font-medium">
                      🎉 You can redeem 100 points for 10% off your next order!
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Biblical Quote - Compact */}
            <div className="text-center text-amber-600 italic text-xs sm:text-sm border-t border-amber-200 pt-3 print:border-gray-300">
              <p>"The Lord bless you and keep you; the Lord makes His face shine on you and be gracious to you."</p>
              <p className="mt-1 font-medium">Numbers 6:24-25</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Enhanced Print Styles for Mobile */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .print\\:hidden {
            display: none !important;
          }
          .print\\:shadow-none {
            box-shadow: none !important;
          }
          .print\\:border-none {
            border: none !important;
          }
          .print\\:border-gray-300 {
            border-color: #d1d5db !important;
          }
          .print\\:bg-gray-100 {
            background-color: #f3f4f6 !important;
          }
          @page {
            size: A4;
            margin: 0.5in;
          }
          .max-w-md {
            max-width: 100% !important;
          }
          /* Ensure everything fits on one page */
          * {
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
        }
        
        @media screen and (max-width: 640px) {
          /* Mobile-specific adjustments */
          .max-w-md {
            max-width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
