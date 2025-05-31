import type React from "react"

interface ReceiptProps {
  items: { name: string; price: number; quantity: number }[]
  total: number
}

const Receipt: React.FC<ReceiptProps> = ({ items, total }) => {
  return (
    <div className="relative p-4 bg-white rounded-md shadow-md w-96">
      {/* Watermark */}
      <div className="absolute inset-0 opacity-5 pointer-events-none">
        <img src="/images/pd-logo-watermark.png" alt="Watermark" className="object-contain w-full h-full" />
      </div>

      {/* Receipt Header */}
      <div className="text-center mb-4">
        <h2 className="text-xl font-bold">Receipt</h2>
      </div>

      {/* Items List */}
      <ul className="mb-4">
        {items.map((item, index) => (
          <li key={index} className="flex justify-between py-1 border-b border-gray-200">
            <span>
              {item.name} ({item.quantity})
            </span>
            <span>${(item.price * item.quantity).toFixed(2)}</span>
          </li>
        ))}
      </ul>

      {/* Total */}
      <div className="flex justify-between font-bold">
        <span>Total:</span>
        <span>${total.toFixed(2)}</span>
      </div>
    </div>
  )
}

export default Receipt
