"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Printer } from "lucide-react"

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
}

export default function Receipt({
  receiptId,
  customerName,
  customerContact,
  deliveryDate,
  deliveryTime,
  paymentMethod,
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
}: ReceiptProps) {
  const handlePrintPDF = () => {
    window.print()
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        {/* Print Button - Hidden when printing */}
        <div className="print:hidden mb-6 flex justify-end">
          <Button onClick={handlePrintPDF} className="bg-orange-600 hover:bg-orange-700 text-white">
            <Printer className="w-4 h-4 mr-2" />
            Print PDF
          </Button>
        </div>

        {/* Receipt */}
        <Card className="bg-amber-50 border-amber-200 print:shadow-none print:border-none">
          <CardContent className="p-6">
            {/* Receipt Header */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-amber-800 mb-2">Receipt #{receiptId}</h2>
              </div>
            </div>

            {/* Company Info and QR Code */}
            <div className="bg-white p-6 rounded-lg border border-amber-200 mb-6 print:border-gray-300">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <img src="/images/pd-logo.png" alt="P&D Pastry Delights Logo" className="w-12 h-12 object-contain" />
                  <div>
                    <h3 className="font-bold text-amber-800">P&D Pastry Delights</h3>
                    <p className="text-sm text-amber-600">Premium Puff Pastries</p>
                  </div>
                </div>
                <div className="text-right">
                  <img src="/images/qr-code.png" alt="QR Code" className="w-16 h-16 object-contain" />
                </div>
              </div>
              <div className="mt-4 text-sm text-amber-600">
                <div>Receipt ID: {receiptId}</div>
                <div>
                  Generated: {new Date().toLocaleDateString()} at {new Date().toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* Customer and Delivery Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Customer Information */}
              <div className="bg-white p-4 rounded-lg border border-amber-200 print:border-gray-300">
                <h4 className="font-semibold text-amber-800 mb-3">Customer Information</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Name:</span> {customerName}
                  </div>
                  <div>
                    <span className="font-medium">Contact:</span> {customerContact}
                  </div>
                </div>
              </div>

              {/* Delivery Details */}
              <div className="bg-white p-4 rounded-lg border border-amber-200 print:border-gray-300">
                <h4 className="font-semibold text-amber-800 mb-3">Delivery Details</h4>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Date:</span> {deliveryDate}
                  </div>
                  <div>
                    <span className="font-medium">Time:</span> {deliveryTime}
                  </div>
                  <div>
                    <span className="font-medium">Payment:</span> {paymentMethod}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">🚚 Delivery:</span>
                    <span className={isDelivery ? "text-blue-600" : "text-gray-600"}>{isDelivery ? "Yes" : "No"}</span>
                  </div>
                  {isDelivery && (
                    <>
                      <div>
                        <span className="font-medium">Delivery Address:</span> {deliveryAddress}
                      </div>
                      <div>
                        <span className="font-medium">Delivery Fee:</span> ${deliveryFee.toFixed(2)}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Items Ordered */}
            <div className="bg-white p-4 rounded-lg border border-amber-200 mb-6 print:border-gray-300">
              <h4 className="font-semibold text-amber-800 mb-4">Items Ordered</h4>
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={index} className="border-b border-gray-100 pb-3 last:border-b-0">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium text-amber-800">{item.name}</div>
                        <div className="text-sm text-amber-600">{item.category}</div>
                        <div className="text-sm text-gray-600">Qty: {item.quantity}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold">${item.total.toFixed(2)}</div>
                        <div className="text-sm text-gray-600">@ ${item.unitPrice.toFixed(2)}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Order Summary with detailed breakdown */}
            <div className="bg-white p-4 rounded-lg border border-amber-200 mb-6 print:border-gray-300">
              <h4 className="flex items-center gap-2 font-semibold text-amber-800 mb-4">
                📋 Order Calculation Breakdown
              </h4>

              {/* Items breakdown */}
              <div className="space-y-2 mb-4">
                <h5 className="font-medium text-amber-700">Items Ordered:</h5>
                {items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm bg-gray-50 p-2 rounded">
                    <span>
                      {item.quantity}x {item.name} ({item.category}) @ ${item.unitPrice.toFixed(2)}
                    </span>
                    <span className="font-medium">${item.total.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <Separator className="my-3" />

              {/* Step-by-step calculations */}
              <div className="space-y-2">
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

                <div className="flex justify-between font-semibold bg-amber-50 p-2 rounded print:bg-gray-100">
                  <span>{discount > 0 ? "3." : "2."} Subtotal After Discount:</span>
                  <span>${preTaxSubtotal.toFixed(2)}</span>
                </div>

                {isDelivery && deliveryFee > 0 && (
                  <div className="flex justify-between text-blue-600">
                    <span>{discount > 0 ? "4." : "3."} Delivery Fee:</span>
                    <span>+${deliveryFee.toFixed(2)}</span>
                  </div>
                )}

                <div className="flex justify-between">
                  <span>
                    {isDelivery ? (discount > 0 ? "5." : "4.") : discount > 0 ? "4." : "3."} Tax{" "}
                    {paymentMethod === "cash" ? "(0% for Cash)" : `(${(taxRate * 100).toFixed(2)}%)`}:
                  </span>
                  <span>+${tax.toFixed(2)}</span>
                </div>

                <Separator />

                <div className="flex justify-between text-lg font-bold text-amber-800">
                  <span>Final Total:</span>
                  <span>${finalTotal.toFixed(2)}</span>
                </div>

                {isPaid && (
                  <div className="text-center mt-4">
                    <span className="bg-green-100 text-green-800 px-4 py-2 rounded-full font-semibold">PAID</span>
                  </div>
                )}
              </div>

              {/* Delivery details if applicable */}
              {isDelivery && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200 print:bg-gray-100 print:border-gray-300">
                  <h5 className="flex items-center gap-2 font-medium text-blue-800 mb-2">🚚 Delivery Information:</h5>
                  <div className="text-sm text-blue-700">
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

            {/* Biblical Quote */}
            <div className="text-center text-amber-600 italic text-sm border-t border-amber-200 pt-4 print:border-gray-300">
              <p>"The Lord bless you and keep you; the Lord makes His face shine on you and be gracious to you."</p>
              <p className="mt-1 font-medium">Numbers 6:24-25</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
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
        }
      `}</style>
    </div>
  )
}
