"use client"

import { useState } from "react"
import { X } from "lucide-react"

export default function FirebaseBanner() {
  const [isVisible, setIsVisible] = useState(true)

  if (!isVisible) return null

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-orange-500 mr-2">🔥</span>
        <p className="text-blue-700 text-sm">
          <span className="font-medium">Firebase Integration Active</span> - Orders will be saved to your Firestore
          database in real-time
        </p>
      </div>
      <button onClick={() => setIsVisible(false)} className="text-gray-500 hover:text-gray-700">
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
